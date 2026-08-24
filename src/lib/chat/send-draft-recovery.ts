export function recoverFailedSendText(current: string, failedDraft: string) {
  return current || failedDraft;
}

export function recoverFailedSendValue<T>(current: T | null, failedDraft: T | null) {
  return current ?? failedDraft;
}
