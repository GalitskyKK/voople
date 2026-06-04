import { MessagesSection } from "./MessagesSection";

export default function MessagesRouteLayout({ children }: { children: React.ReactNode }) {
  return <MessagesSection>{children}</MessagesSection>;
}
