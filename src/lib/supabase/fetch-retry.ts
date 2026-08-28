function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  const cause = (error as Error & { cause?: { code?: string } }).cause
  const code = cause?.code ?? ""
  return (
    msg.includes("fetch failed") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket") ||
    error.name === "AbortError" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT"
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function isFutureJwtResponse(response: Response) {
  if (response.status !== 401) return false
  try {
    return (await response.clone().text()).toLowerCase().includes("jwt issued at future")
  } catch {
    return false
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number
) {
  const controller = new AbortController()
  const externalSignal = init?.signal
  let timedOut = false

  if (externalSignal?.aborted) {
    controller.abort(externalSignal.reason)
  }

  const abortFromExternalSignal = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true })

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    const request = fetch(input, {
      ...init,
      cache: init?.cache ?? "no-store",
      signal: controller.signal
    })
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true
        controller.abort(new Error(`Supabase request timeout after ${timeoutMs}ms`))
        reject(new Error(`Supabase request timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    return await Promise.race([request, timeout])
  } catch (error) {
    if (timedOut) {
      throw new Error(`Supabase request timeout after ${timeoutMs}ms`, { cause: error })
    }
    throw error
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    externalSignal?.removeEventListener("abort", abortFromExternalSignal)
  }
}

/** Устойчивый fetch для Supabase REST / Realtime (Windows + pooler). */
export function createFetchWithRetry(maxAttempts = 2, timeoutMs = 4_500): typeof fetch {
  return async (input, init) => {
    let lastError: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetchWithTimeout(input, init, timeoutMs)
        if (attempt < maxAttempts - 1 && await isFutureJwtResponse(response)) {
          lastError = new Error("Supabase rejected a token before its issued-at time")
          await sleep(1_000)
          continue
        }
        return response
      } catch (error) {
        lastError = error
        if (!isRetryableNetworkError(error) || attempt === maxAttempts - 1) {
          throw error
        }
        await sleep(120 * 2 ** attempt)
      }
    }
    throw lastError
  }
}
