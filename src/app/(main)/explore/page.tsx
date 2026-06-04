import { UserSearch } from "@/components/explore/UserSearch";
import { SectionFrame } from "@/components/layout/SectionFrame";
import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { COPY } from "@/lib/constants/copy";

export default function ExplorePage() {
  return (
    <SectionFrame className="py-4 lg:py-6">
      <SectionPageHeader title={COPY.search} description="Люди, хэштеги, посты и тренды" />
      <div className="px-4 pb-4 lg:px-6">
        <UserSearch />
      </div>
    </SectionFrame>
  );
}
