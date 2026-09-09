import { ChatConversationState } from "./ChatConversationState";

export function SavedMessagesConnectionState({
  online,
  loadError,
  actionError,
  onRetry,
}: {
  online: boolean;
  loadError?: string | null;
  actionError?: string | null;
  onRetry: () => Promise<unknown>;
}) {
  if (!online) {
    return <ChatConversationState mode="offline" variant="inline" onRetry={() => void onRetry()} />;
  }

  const message = actionError ?? loadError;
  if (!message) return null;

  return (
    <ChatConversationState
      mode="error"
      variant="inline"
      message={message}
      onRetry={loadError ? () => void onRetry() : undefined}
    />
  );
}
