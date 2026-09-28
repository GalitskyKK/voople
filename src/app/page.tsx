import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { SITE_DESCRIPTION } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Voople — мессенджер для своих",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingPage />;
}
