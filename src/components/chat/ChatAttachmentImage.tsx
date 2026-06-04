"use client";

type ChatAttachmentImageProps = {
  url: string;
  alt?: string;
  onOpen: () => void;
};

export function ChatAttachmentImage({ url, alt = "Вложение", onOpen }: ChatAttachmentImageProps) {
  return (
    <button
      type="button"
      className="voople-chat-image block overflow-hidden rounded-[var(--app-radius-md)] text-left"
      onClick={onOpen}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned private URLs */}
      <img src={url} alt={alt} className="max-h-72 max-w-full object-cover" loading="lazy" />
    </button>
  );
}
