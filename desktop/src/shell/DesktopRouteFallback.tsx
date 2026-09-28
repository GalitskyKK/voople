import { BrandedLoadingView } from "@/components/brand/BrandedLoadingView";
import { AppPageContent } from "@/components/layout/AppPageContent";
import { ProfileLoadingView } from "@/components/profile/ProfileLoadingView";

export function DesktopRouteFallback({ profile = false }: { profile?: boolean }) {
  return (
    <AppPageContent className="py-4 lg:py-6">
      {profile ? <ProfileLoadingView /> : <BrandedLoadingView compact />}
    </AppPageContent>
  );
}
