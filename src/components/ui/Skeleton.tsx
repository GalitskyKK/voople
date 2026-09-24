import { cn } from "@/lib/utils";

type SkeletonProps = {
  shape?: "avatar" | "text" | "room" | "row";
  className?: string;
};

export function Skeleton({ shape = "text", className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn("voople-skeleton", `voople-skeleton--${shape}`, className)} />;
}
