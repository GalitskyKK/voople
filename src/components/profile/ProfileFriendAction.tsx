"use client";

import { useAuthGate } from "@/components/auth/AuthGateContext";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc/client";

export function ProfileFriendAction({ userId }: { userId: string }) {
  const { authenticated, requireAuth } = useAuthGate();
  const utils = trpc.useUtils();
  const relation = trpc.social.friendState.useQuery({ userId }, { enabled: authenticated, staleTime: 15_000 });
  const refresh = () => {
    void utils.social.friendState.invalidate({ userId });
    void utils.social.myFriends.invalidate();
    void utils.social.incomingFriendRequests.invalidate();
    void utils.social.myPinnedContacts.invalidate();
  };
  const send = trpc.social.sendFriendRequest.useMutation({ onSuccess: refresh });
  const respond = trpc.social.respondFriendRequest.useMutation({ onSuccess: refresh });
  const cancel = trpc.social.cancelFriendRequest.useMutation({ onSuccess: refresh });
  const remove = trpc.social.removeFriend.useMutation({ onSuccess: refresh });
  const pending = relation.isLoading || send.isPending || respond.isPending || cancel.isPending || remove.isPending;
  const state = relation.data?.state ?? "none";
  const requestId = relation.data?.requestId;
  const error = relation.error ?? send.error ?? respond.error ?? cancel.error ?? remove.error;
  const authorize = () => requireAuth({ title: "Друзья" });

  if (state === "self" || state === "blocked") return null;
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-2" aria-label="Дружба">
      {state === "none" ? <Button type="button" size="sm" className="h-11 flex-1 sm:h-8" disabled={pending}
        onClick={() => { if (authorize()) send.mutate({ userId }); }}>
        Добавить в друзья
      </Button> : null}
      {state === "outgoing_pending" ? <>
        <Button type="button" size="sm" variant="secondary" className="h-11 flex-1 sm:h-8" disabled aria-label="Запрос в друзья отправлен">Запрос отправлен</Button>
        {requestId ? <Button type="button" size="sm" variant="secondary" className="h-11 sm:h-8" disabled={pending}
          onClick={() => cancel.mutate({ requestId })}>Отменить запрос</Button> : null}
      </> : null}
      {state === "incoming_pending" && requestId ? <>
        <Button type="button" size="sm" className="h-11 flex-1 sm:h-8" disabled={pending}
          onClick={() => respond.mutate({ requestId, accept: true })}>Принять</Button>
        <Button type="button" size="sm" variant="secondary" className="h-11 sm:h-8" disabled={pending}
          onClick={() => respond.mutate({ requestId, accept: false })}>Отклонить</Button>
      </> : null}
      {state === "friends" ? <>
        <Button type="button" size="sm" variant="secondary" className="h-11 flex-1 sm:h-8" disabled aria-label="Вы в друзьях">В друзьях</Button>
        <Button type="button" size="sm" variant="secondary" className="h-11 sm:h-8" disabled={pending}
          onClick={() => { if (window.confirm("Удалить пользователя из друзей?")) remove.mutate({ userId }); }}>Удалить</Button>
      </> : null}
      {error ? <p role="alert" className="basis-full text-xs text-red-400">{error.message}</p> : null}
    </div>
  );
}
