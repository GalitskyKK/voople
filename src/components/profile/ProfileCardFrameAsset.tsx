"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type ProfileCardFrameAssetProps = {
  src: string;
  className?: string;
};

type ProfileCardFrameSliceProps = ProfileCardFrameAssetProps & {
  viewBox: string;
};

/**
 * CDN customization files are optional. A missing legacy divider should
 * disappear quietly instead of showing the browser's broken-image glyph.
 */
export function ProfileCardFrameAsset({
  src,
  className,
}: ProfileCardFrameAssetProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated/transparent CDN customization asset.
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn("block", className)}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Crops one region from the canonical 1200×1600 frame without decoding or
 * duplicating the source file. Caps keep their aspect ratio; only plain side
 * rails are allowed to stretch with the dynamic profile-card height.
 */
export function ProfileCardFrameSlice({
  src,
  className,
  viewBox,
}: ProfileCardFrameSliceProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="none"
      className={cn("block", className)}
      aria-hidden
      focusable="false"
    >
      <image
        href={src}
        x="0"
        y="0"
        width="1200"
        height="1600"
        preserveAspectRatio="none"
        onError={() => setFailed(true)}
      />
    </svg>
  );
}
