import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  variant = "panel",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "panel" | "raised" | "inset" | "row";
}) {
  return (
    <div className={cn("voople-panel", variant === "raised" && "voople-panel--raised", variant === "inset" && "voople-panel--inset", variant === "row" && "voople-material-row", className)}>
      {children}
    </div>
  );
}
