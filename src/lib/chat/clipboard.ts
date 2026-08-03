export function getChatClipboardFile(clipboardData: DataTransfer): File | null {
  for (const item of clipboardData.items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  return clipboardData.files.item(0);
}
