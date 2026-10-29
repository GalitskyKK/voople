"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { layoutVoiceGrid } from "@/lib/livekit/voice-grid-layout";
import type { ChatRoomParticipantView } from "@/types/chat";

export function OrbitVoiceGrid({ participants, renderParticipant }: {
  participants: ChatRoomParticipantView[];
  renderParticipant: (participant: ChatRoomParticipantView) => ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 320, height: 480 });
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setBounds({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const grid = layoutVoiceGrid(bounds.width, bounds.height, participants.length);
  return <div ref={root} className="voople-full-room__stage voople-orbit-call-grid voople-scroll" aria-label="Участники разговора">
    <div className="voople-orbit-call-grid__tiles" style={{ width: grid.width, gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`, "--call-tile-size": `${grid.size}px`, "--call-grid-gap": `${grid.gap}px` } as CSSProperties}>
      {participants.map(participant => <div key={participant.id} className="voople-orbit-call-grid__slot">{renderParticipant(participant)}</div>)}
    </div>
  </div>;
}
