import Image from "next/image";

import { cn } from "@/lib/utils";
import type { PostMediaType } from "@/types/domain";

type PostMediaProps = {
  url: string;
  mediaType?: PostMediaType | null;
  className?: string;
  alt?: string;
};

export function PostMedia({ url, mediaType, className, alt = "Вложение" }: PostMediaProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-black/20",
        className,
      )}
    >
      <Image
        src={url}
        alt={alt}
        width={800}
        height={600}
        className="max-h-96 w-full object-contain"
        unoptimized={mediaType === "gif"}
      />
    </div>
  );
}
