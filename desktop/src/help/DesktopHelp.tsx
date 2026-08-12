import { HelpCenterView } from "@/components/help/HelpCenterView";

export function DesktopHelp({ navigate }: { navigate: (href: string) => void }) {
  return (
    <HelpCenterView
      renderDestination={({ href, className, children }) => (
        <button type="button" className={`${className} w-full text-left`} onClick={() => navigate(href)}>{children}</button>
      )}
    />
  );
}
