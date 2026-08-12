"use client";

import Link from "next/link";

import { HelpCenterView } from "./HelpCenterView";

export function AppHelpPage() {
  return <HelpCenterView renderDestination={({ href, className, children }) => <Link href={href} className={className}>{children}</Link>} />;
}
