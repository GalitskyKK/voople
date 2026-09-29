export type DesktopSearchDestination = {
  pathname: "/search";
  query: string;
};

export function desktopSearchDestination(href: string): DesktopSearchDestination | null {
  const [pathname, search = ""] = href.split("?", 2);
  if (pathname !== "/search" && pathname !== "/explore") return null;
  const query = new URLSearchParams(search).get("q")?.slice(0, 100) ?? "";
  return { pathname: "/search", query };
}
