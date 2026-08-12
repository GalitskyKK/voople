import { Crown, LockKeyhole } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function VooplePlusBadge({
  locked = false,
  className,
}: {
  locked?: boolean;
  className?: string;
}) {
  const Icon = locked ? LockKeyhole : Crown;
  return (
    <span className={cn("voople-plus-badge", className)}>
      <Icon className="h-3 w-3" aria-hidden />
      Вупл+
    </span>
  );
}

export function VooplePlusFeatureSurface({
  title,
  description,
  locked = false,
  action,
  children,
  className,
}: {
  title: string;
  description: string;
  locked?: boolean;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("voople-plus-surface", className)}>
      <div className="voople-plus-surface__heading">
        <div className="min-w-0">
          <VooplePlusBadge locked={locked} />
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {action ? <div className="voople-plus-surface__action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
