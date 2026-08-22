import { UserSearch } from "@/components/explore/UserSearch";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <UserSearch initialQuery={q?.slice(0, 100) ?? ""} />;
}
