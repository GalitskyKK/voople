import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--app-radius-md)] font-medium",
        "transition-all duration-200 ease-out",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98] motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--material-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        variant === "primary" &&
          "border border-[color-mix(in_srgb,var(--material-ice)_24%,var(--material-border))] bg-[var(--material-interactive-fill)] font-semibold text-[var(--foreground)] shadow-[var(--app-shadow-sm)] hover:border-[var(--material-ice)] hover:bg-[var(--material-control-fill)]",
        variant === "secondary" &&
          "voople-material-control text-[var(--foreground)]",
        variant === "ghost" &&
          "bg-transparent text-[color-mix(in_srgb,var(--foreground)_82%,transparent)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--foreground)]",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-[0.9375rem]",
        className,
      )}
      {...props}
    />
  );
}
