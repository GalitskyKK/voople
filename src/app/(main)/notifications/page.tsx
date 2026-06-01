import { NotificationsList } from "@/components/notifications/NotificationsList";
import { COPY } from "@/lib/constants/copy";

export default function NotificationsPage() {
  return (
    <div className="voople-notifications-page mx-auto max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold">{COPY.notifications}</h1>
      <NotificationsList />
    </div>
  );
}
