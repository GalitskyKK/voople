import { UserSearch } from "@/components/explore/UserSearch";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  return <UserSearch initialQuery={typeof q === "string" ? q.slice(0, 100) : ""} />;
}
