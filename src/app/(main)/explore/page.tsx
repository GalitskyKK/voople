import { redirect } from "next/navigation";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 100) : "";
  redirect(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
}
