import { Geist, Geist_Mono } from "next/font/google";

import { WebsiteJsonLd } from "@/components/seo/WebsiteJsonLd";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { createRootMetadata } from "@/lib/seo/metadata";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { AppThemeSync } from "@/components/theme/AppThemeSync";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = createRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="relative min-h-dvh bg-background text-foreground antialiased">
        <WebsiteJsonLd />
        <a href="#main-content" className="voople-skip-link">
          Перейти к содержимому
        </a>
        <TRPCReactProvider>
          <AppThemeProvider>
            <div aria-hidden className="voople-grain fixed inset-0 -z-[5]" />
            <AppThemeSync />
            {children}
          </AppThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
