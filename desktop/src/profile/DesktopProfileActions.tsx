import type { Session } from "@supabase/supabase-js";
import { LoaderCircle, MessageCircle, Pencil, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { ProfileViewModel } from "@/types/domain";

import { createDesktopTrpcClient } from "../api/trpc";
import type { DesktopConfig } from "../config";

type FollowState = { following?: boolean; followsYou?: boolean };

export function DesktopProfileActions({
  config,
  isOwner,
  navigate,
  onUpdated,
  profile,
  session,
}: {
  config: DesktopConfig;
  isOwner: boolean;
  navigate: (href: string) => void;
  onUpdated: () => void;
  profile: ProfileViewModel;
  session: Session;
}) {
  const client = useMemo(
    () => createDesktopTrpcClient(config, () => session.access_token),
    [config, session.access_token],
  );
  const [followState, setFollowState] = useState<FollowState>();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOwner) return;
    let active = true;
    void client
      .query("profile.getFollowState", { username: profile.username })
      .then((value) => {
        if (active) setFollowState(value as FollowState);
      })
      .catch(() => {
        if (active) setFollowState({});
      });
    return () => {
      active = false;
    };
  }, [client, isOwner, profile.username]);

  const run = async (action: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Не удалось выполнить действие",
      );
    } finally {
      setPending(false);
    }
  };

  if (isOwner) {
    return (
      <>
        <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
          Редактировать
        </Button>
        <Sheet open={editing} onClose={() => setEditing(false)} className="max-w-md">
          <h2 className="text-xl font-semibold">Редактировать профиль</h2>
          <div className="mt-5 space-y-4">
            <label className="voople-label">
              Отображаемое имя
              <input
                className="voople-input mt-1.5"
                maxLength={50}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="voople-label">
              О себе
              <textarea
                className="voople-input mt-1.5 min-h-24 resize-none"
                maxLength={100}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </label>
            {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
            <Button
              type="button"
              className="w-full"
              disabled={pending || !displayName.trim()}
              onClick={() => void run(async () => {
                await client.mutation("profile.update", {
                  displayName: displayName.trim(),
                  bio: bio.trim() || null,
                });
                setEditing(false);
                onUpdated();
              })}
            >
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Сохранить
            </Button>
          </div>
        </Sheet>
      </>
    );
  }

  const following = followState?.following === true;
  const followLabel = following
    ? "Отписаться"
    : followState?.followsYou
      ? "Подписаться в ответ"
      : "Подписаться";

  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={following ? "secondary" : "primary"}
        disabled={pending || !followState}
        onClick={() => void run(async () => {
          const next = await client.mutation("profile.toggleFollow", {
            username: profile.username,
          }) as { following?: boolean };
          setFollowState((current) => ({ ...current, following: next.following === true }));
          onUpdated();
        })}
      >
        {following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {followLabel}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => void run(async () => {
          const result = await client.mutation("chat.openDirect", {
            username: profile.username,
          }) as { chatId?: string };
          if (!result.chatId) throw new Error("Сервер не вернул чат");
          navigate(`/messages/${result.chatId}`);
        })}
      >
        <MessageCircle className="h-4 w-4" />
        Сообщение
      </Button>
      {error ? <p className="w-full text-xs text-red-400" role="alert">{error}</p> : null}
    </div>
  );
}
