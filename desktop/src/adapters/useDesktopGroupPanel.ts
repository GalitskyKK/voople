import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import type { GroupInfoDrawerTab } from "@/components/chat/GroupInfoDrawerView";
import type { ChatGroupMemberView, GroupCommunityView } from "@/types/chat";
import type { GroupDiscoveryProfileView, InterestCatalogView } from "@/types/social";

import type { DesktopConfig } from "../config";
import { createDesktopTrpcClient } from "../api/trpc";

export function useDesktopGroupPanel({
  chatId,
  config,
  enabled,
  session,
}: {
  chatId: string;
  config: DesktopConfig;
  enabled: boolean;
  session: Session;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<GroupInfoDrawerTab>("info");
  const [community, setCommunity] = useState<GroupCommunityView | null>(null);
  const [members, setMembers] = useState<ChatGroupMemberView[]>([]);
  const [roomParticipantIds, setRoomParticipantIds] = useState<ReadonlySet<string>>(() => new Set());
  const [topicNames, setTopicNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagPending, setTagPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, [chatId]);

  const load = () => {
    if (!enabled) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const client = createDesktopTrpcClient(config, () => session.access_token);
    const request = Promise.all([
      client.query("chat.groupCommunity", { chatId }),
      client.query("chat.groupMembers", { chatId }),
      client.query("chat.room", { chatId }),
      client.query("social.groupDiscoveryProfile", { chatId }),
      client.query("social.interestCatalog"),
    ]).then(([communityValue, membersValue, roomValue, discoveryValue, catalogValue]) => {
      if (requestId !== requestIdRef.current) return;
      setCommunity(communityValue as GroupCommunityView);
      setMembers(membersValue as ChatGroupMemberView[]);
      const room = roomValue as { participants?: Array<{ id: string }> };
      setRoomParticipantIds(new Set(room.participants?.map((participant) => participant.id) ?? []));
      const discovery = discoveryValue as GroupDiscoveryProfileView;
      const catalog = catalogValue as InterestCatalogView;
      const interests = catalog.categories.flatMap((category) => category.interests);
      setTopicNames(discovery.topicSlugs.map((slug) =>
        interests.find((interest) => interest.slug === slug)?.name ?? slug));
    });
    void request
      .catch((cause) => {
        if (requestId === requestIdRef.current) {
          setError(cause instanceof Error ? cause.message : "Не удалось загрузить информацию о группе");
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  };

  const toggleProfileTag = async () => {
    if (!community?.effectiveTag || tagPending) return;
    setTagPending(true);
    setError(null);
    try {
      const client = createDesktopTrpcClient(config, () => session.access_token);
      await client.mutation("chat.setGroupProfileTag", {
        chatId: community.tagEquippedByMe ? null : chatId,
      });
      setCommunity((current) => current ? {
        ...current,
        tagEquippedByMe: !current.tagEquippedByMe,
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось изменить тег профиля");
    } finally {
      setTagPending(false);
    }
  };

  return {
    community,
    error,
    load,
    loading,
    members,
    open,
    roomParticipantIds,
    setOpen,
    setTab,
    tab,
    tagPending,
    toggleProfileTag,
    topicNames,
  };
}
