import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { WebsiteJsonLd } from "@/components/seo/WebsiteJsonLd";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { createRootMetadata } from "@/lib/seo/metadata";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { AppThemeSync } from "@/components/theme/AppThemeSync";
import { AppPreferencesProvider } from "@/components/settings/AppPreferencesProvider";
import { WebVitalsReporter } from "@/components/telemetry/WebVitalsReporter";

import "./globals.css";

export const metadata = createRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="relative min-h-dvh bg-background text-foreground antialiased">
        <WebsiteJsonLd />
        <a href="#main-content" className="voople-skip-link">
          Перейти к содержимому
        </a>
        <TRPCReactProvider>
          <AppThemeProvider>
            <AppPreferencesProvider>
              <div aria-hidden className="voople-grain fixed inset-0 -z-[5]" />
              <AppThemeSync />
              <WebVitalsReporter />
              {children}
            </AppPreferencesProvider>
          </AppThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
