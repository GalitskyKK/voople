import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import type { ChatGroupMemberView, GroupCommunityView } from "@/types/chat";
import type { GroupNowView } from "@/types/group-now";

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
  const [community, setCommunity] = useState<GroupCommunityView | null>(null);
  const [members, setMembers] = useState<ChatGroupMemberView[]>([]);
  const [now, setNow] = useState<GroupNowView | undefined>();
  const [loading, setLoading] = useState(false);
  const [tagPending, setTagPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, [chatId]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const client = createDesktopTrpcClient(config, () => session.access_token);
    const refresh = () => { void client.query("chat.coreGroupNow", { groupId: chatId }).then((value) => {
      if (active) setNow(value as GroupNowView);
    }).catch(() => undefined); };
    refresh();
    const timer = window.setInterval(refresh, 20_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [chatId, config, enabled, session.access_token]);

  const load = () => {
    if (!enabled) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const client = createDesktopTrpcClient(config, () => session.access_token);
    const request = Promise.all([
      client.query("chat.groupCommunity", { chatId }),
      client.query("chat.groupMembers", { chatId }),
    ]).then(([communityValue, membersValue]) => {
      if (requestId !== requestIdRef.current) return;
      setCommunity(communityValue as GroupCommunityView);
      setMembers(membersValue as ChatGroupMemberView[]);
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
    now,
    open,
    setOpen,
    tagPending,
    toggleProfileTag,
  };
}
