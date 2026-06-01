import { UserSearch } from "@/components/explore/UserSearch";
import { COPY } from "@/lib/constants/copy";

export default function ExplorePage() {
  return (
    <div className="voople-explore-page mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold">{COPY.search}</h1>
      <p className="mt-1 text-sm text-white/50">Люди, хэштеги, посты и тренды</p>
      <UserSearch />
    </div>
  );
}
