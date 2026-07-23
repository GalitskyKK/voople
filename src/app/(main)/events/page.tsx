import type { Metadata } from "next";

import { EventsPage } from "@/components/events/EventsPage";

export const metadata: Metadata = {
  title: "События Voople",
  description: "Сезонные события, испытания и уникальные награды Voople.",
};

export default function EventsRoute() {
  return <EventsPage />;
}
