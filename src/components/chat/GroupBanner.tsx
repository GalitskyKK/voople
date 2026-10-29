export function GroupBanner({ name, icon, url }: { name: string; icon: string | null; url: string | null }) {
  return <span className="voople-group-pane-banner" data-has-banner={Boolean(url)}
    style={url ? { backgroundImage: `url("${url}")` } : undefined} aria-hidden="true">
    {url ? null : <span className="voople-group-pane-banner__fallback">{icon || name.charAt(0)}</span>}
  </span>;
}
