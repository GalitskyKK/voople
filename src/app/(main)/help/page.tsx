import type { Metadata } from "next";

import { AppHelpPage } from "@/components/help/AppHelpPage";

export const metadata: Metadata = {
  title: "Справочный центр",
  robots: { index: false, follow: false },
};

export default function HelpPage() {
  return <AppHelpPage />;
}
