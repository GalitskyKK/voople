import { BrandedLoadingView } from "@/components/brand/BrandedLoadingView";
import { AppPageContent } from "@/components/layout/AppPageContent";

export function DesktopRouteFallback() {
  return (
    <AppPageContent className="py-4 lg:py-6">
      <BrandedLoadingView compact />
    </AppPageContent>
  );
}
