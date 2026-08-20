type ExternalLinkOpener = (url: string) => void | Promise<void>;

let platformOpener: ExternalLinkOpener | null = null;

export function registerExternalLinkOpener(opener: ExternalLinkOpener) {
  platformOpener = opener;
  return () => {
    if (platformOpener === opener) platformOpener = null;
  };
}

export async function openExternalUrl(url: string) {
  if (platformOpener) {
    await platformOpener(url);
    return;
  }
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) throw new Error("Браузер заблокировал новое окно");
}
