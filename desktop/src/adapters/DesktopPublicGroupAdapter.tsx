import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandedLoadingView } from "@/components/brand/BrandedLoadingView";
import { PublicGroupPageView } from "@/components/chat/PublicGroupPageView";
import { AppPageContent } from "@/components/layout/AppPageContent";
import type { PublicGroupPageView as PublicGroupPageModel } from "@/types/chat";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

export function DesktopPublicGroupAdapter({
  config,
  session,
  slug,
  navigate,
}: {
  config: DesktopConfig;
  session: Session;
  slug: string;
  navigate: (href: string) => void;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const [group, setGroup] = useState<PublicGroupPageModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadGeneration, setReloadGeneration] = useState(0);
  const loadGeneration = useRef(0);

  useEffect(() => {
    const generation = ++loadGeneration.current;
    void client.query("chat.publicGroupBySlug", { slug })
      .then((value) => {
        if (loadGeneration.current !== generation) return;
        const nextGroup = value as PublicGroupPageModel;
        setGroup(nextGroup);
        setRequestPending(nextGroup.joinRequestPending);
      })
      .catch((cause: unknown) => {
        if (loadGeneration.current !== generation) return;
        setError(cause instanceof Error ? cause.message : "Не удалось загрузить группу");
      })
      .finally(() => {
        if (loadGeneration.current === generation) setLoading(false);
      });
    return () => {
      loadGeneration.current += 1;
    };
  }, [client, reloadGeneration, slug]);

  const openGroup = async () => {
    if (!group) return;
    if (group.joined) {
      navigate(`/messages/${group.id}`);
      return;
    }
    if (group.joinPolicy === "invite_only" || requestPending || actionPending) return;

    setActionPending(true);
    setError(null);
    try {
      const result = await client.mutation("chat.joinPublicGroup", { chatId: group.id }) as {
        chatId: string;
        status: "joined" | "requested";
      };
      if (result.status === "joined") navigate(`/messages/${result.chatId}`);
      else setRequestPending(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось вступить в группу");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <AppPageContent className="py-4 lg:py-6">
      {loading ? <BrandedLoadingView compact /> : null}
      {!loading && !group ? (
        <div className="feed-message" role="alert">
          <p>{error ?? "Группа не найдена"}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              setReloadGeneration((generation) => generation + 1);
            }}
          >
            Повторить
          </button>
        </div>
      ) : null}
      {group ? (
        <PublicGroupPageView
          group={group}
          actionPending={actionPending}
          requestPending={requestPending}
          error={error}
          onAction={() => void openGroup()}
        />
      ) : null}
    </AppPageContent>
  );
}
