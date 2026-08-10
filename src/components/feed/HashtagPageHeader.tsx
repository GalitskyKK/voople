import { SectionPageHeader } from "@/components/layout/SectionPageHeader";

export function HashtagPageHeader({ tag }: { tag: string }) {
  return (
    <SectionPageHeader
      title={`#${tag}`}
      description="Посты с этим хэштегом"
      density="compact"
    />
  );
}
