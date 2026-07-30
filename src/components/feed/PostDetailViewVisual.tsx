import type { ReactNode } from "react";

type PostDetailViewVisualProps = {
  backAction: ReactNode;
  children: ReactNode;
};

export function PostDetailViewVisual({
  backAction,
  children,
}: PostDetailViewVisualProps) {
  return (
    <div className="voople-post-detail py-4">
      <div className="mb-4">{backAction}</div>
      {children}
    </div>
  );
}
