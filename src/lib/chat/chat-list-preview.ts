export function isRoomTimelineMessage(content: unknown): boolean {
  return (
    Array.isArray(content) &&
    content.some(
      (node) =>
        typeof node === "object" &&
        node !== null &&
        "type" in node &&
        node.type === "roomEvent",
    )
  );
}
