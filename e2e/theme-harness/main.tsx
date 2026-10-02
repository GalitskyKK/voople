import React from "react";
import { createRoot } from "react-dom/client";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { AppThemeSync } from "@/components/theme/AppThemeSync";
import { AppPreferencesProvider } from "@/components/settings/AppPreferencesProvider";
import { AppSettingsView } from "@/components/settings/AppSettingsView";
import { TRPCReactProvider, trpc } from "@/lib/trpc/client";
import "@/app/globals.css";
import { DesktopTRPCProvider } from "../../desktop/src/api/DesktopTRPCProvider";
import type { Session } from "@supabase/supabase-js";

function Settings() {
  const utils = trpc.useUtils();
  const theme = trpc.customization.accountTheme.useQuery(undefined, { retry: false });
  const legacy = trpc.shop.subscriptionStatus.useQuery(undefined, { retry: false });
  return <>
    <button onClick={() => { void utils.customization.accountTheme.invalidate(); void utils.shop.subscriptionStatus.invalidate(); }}>Refresh account</button>
    <AppSettingsView subscriptionActive={legacy.data?.active}
      selectPaidAppTheme={theme.isError ? false : theme.data?.access.capabilities.selectPaidAppTheme}
      renderDestination={({ href, children, className }) => <a href={href} className={className}>{children}</a>} />
  </>;
}

const content = <AppThemeProvider><AppThemeSync /><AppPreferencesProvider><Settings /></AppPreferencesProvider></AppThemeProvider>;
const desktop = new URLSearchParams(location.search).has("desktop");
const session = { access_token: "disposable-ui-fixture", user: { id: "10000000-0000-4000-8000-000000000001" } } as Session;
createRoot(document.getElementById("root")!).render(desktop
  ? <DesktopTRPCProvider session={session} config={{ apiUrl: location.origin, supabaseUrl: location.origin, supabaseAnonKey: "fixture" }}>{content}</DesktopTRPCProvider>
  : <TRPCReactProvider>{content}</TRPCReactProvider>);
