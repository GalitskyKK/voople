export const AUTH_SESSION_BOOTSTRAP_TIMEOUT_MS = 10_000;

export function isTemporaryAuthError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const value = error as { message?: string; status?: number; code?: string };
  const message = value.message?.toLowerCase() ?? "";
  return (
    value.status === 0 ||
    (typeof value.status === "number" && value.status >= 500) ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("jwt issued at future")
  );
}

export type AuthSessionBootstrapReason =
  | "timeout"
  | "temporary"
  | "unexpected";

export type AuthSessionBootstrapResult<T> =
  | { status: "ready"; value: T | null }
  | {
      status: "error";
      reason: AuthSessionBootstrapReason;
      error: unknown;
    };

type AuthSessionBootstrapResponse<T> = {
  value: T | null;
  error?: unknown;
};

export class AuthSessionBootstrapTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Auth session bootstrap timed out after ${timeoutMs}ms`);
    this.name = "AuthSessionBootstrapTimeoutError";
  }
}

export async function resolveAuthSessionBootstrap<T>(
  load: () => Promise<AuthSessionBootstrapResponse<T>>,
  timeoutMs = AUTH_SESSION_BOOTSTRAP_TIMEOUT_MS,
): Promise<AuthSessionBootstrapResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new AuthSessionBootstrapTimeoutError(timeoutMs)),
        timeoutMs,
      );
    });
    const response = await Promise.race([load(), timeout]);

    if (!response.error) {
      return { status: "ready", value: response.value };
    }
    if (isTemporaryAuthError(response.error)) {
      return {
        status: "error",
        reason: "temporary",
        error: response.error,
      };
    }

    // Invalid or expired persisted credentials are not transient. Treat them as
    // an anonymous session so the normal sign-in flow can recover explicitly.
    return { status: "ready", value: null };
  } catch (error) {
    return {
      status: "error",
      reason:
        error instanceof AuthSessionBootstrapTimeoutError
          ? "timeout"
          : isTemporaryAuthError(error)
            ? "temporary"
            : "unexpected",
      error,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
