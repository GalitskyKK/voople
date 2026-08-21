export type InternalNavigationAdapter = (href: string) => void;

let adapter: InternalNavigationAdapter | null = null;

export function registerInternalNavigationAdapter(next: InternalNavigationAdapter) {
  adapter = next;
  return () => {
    if (adapter === next) adapter = null;
  };
}

export function navigateInternally(href: string) {
  if (!adapter) return false;
  adapter(href);
  return true;
}
