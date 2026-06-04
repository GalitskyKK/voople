import { NotificationsList } from "@/components/notifications/NotificationsList";
import { SectionFrame } from "@/components/layout/SectionFrame";
import { SectionPageHeader } from "@/components/layout/SectionPageHeader";
import { COPY } from "@/lib/constants/copy";

export default function NotificationsPage() {
  return (
    <SectionFrame className="py-4 lg:py-6">
      <SectionPageHeader title={COPY.notifications} />
      <div className="px-4 pb-4 lg:px-6">
        <NotificationsList />
      </div>
    </SectionFrame>
  );
}
