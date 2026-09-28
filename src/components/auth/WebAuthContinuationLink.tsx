"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authEntryHref } from "@/lib/auth/continuation";

type Props = { entry: "/login" | "/register"; children: ReactNode };

export function WebAuthContinuationLink(props: Props) {
  return (
    <Suspense fallback={<span className="voople-link" aria-busy="true">{props.children}</span>}>
      <ContinuationLink {...props} />
    </Suspense>
  );
}

function ContinuationLink({ entry, children }: Props) {
  const params = useSearchParams();
  return <Link href={authEntryHref(entry, params.get("redirect"))} className="voople-link">{children}</Link>;
}
