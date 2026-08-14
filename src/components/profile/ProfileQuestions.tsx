"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, Send } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { ShareButton } from "@/components/ui/ShareButton";
import { useAuthGate } from "@/components/auth/AuthGateProvider";

const QUESTION_MAX_LENGTH = 500;
const ANSWER_MAX_LENGTH = 1000;

type QuestionReaction = { emoji: string; count: number; reactedByViewer: boolean };

type ProfileQuestionsProps = {
  profileUserId: string;
  username: string;
  isOwner: boolean;
  /** Залогиненный посетитель (не владелец) может задавать вопросы. */
  canAsk: boolean;
  /** Любой залогиненный пользователь может ставить реакции на ответы. */
  canReact: boolean;
  /** Сфокусировать форму вопроса при заходе по ask-ссылке. */
  autoFocusAsk?: boolean;
};

export function ProfileQuestions({
  profileUserId,
  username,
  isOwner,
  canAsk,
  canReact,
  autoFocusAsk = false,
}: ProfileQuestionsProps) {
  const utils = trpc.useUtils();
  const { requireAuth } = useAuthGate();

  const answered = trpc.questions.listAnswered.useQuery({ profileUserId });
  const reactions = trpc.questions.listReactions.useQuery({ profileUserId });
  const inbox = trpc.questions.listInbox.useQuery(undefined, { enabled: isOwner });

  return (
    <div className="space-y-4">
      {isOwner && <AskLinkBanner username={username} />}

      {canAsk && (
        <AskQuestionForm
          profileUserId={profileUserId}
          autoFocus={autoFocusAsk}
          onAsked={() => void utils.questions.listAnswered.invalidate({ profileUserId })}
        />
      )}

      {!isOwner && !canAsk && (
        <button
          type="button"
          className="voople-panel flex items-center gap-2 p-4 text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)] transition hover:text-[var(--foreground)]"
          onClick={() => requireAuth({ title: "Задать вопрос" })}
        >
          <HelpCircle className="h-4 w-4 text-(--theme-accent)" />
          Войдите, чтобы задать анонимный вопрос
        </button>
      )}

      {isOwner && inbox.data && inbox.data.length > 0 && (
        <section className="voople-panel space-y-3 p-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Новые вопросы · {inbox.data.length}
          </h3>
          <ul className="space-y-3">
            {inbox.data.map((q) => (
              <InboxQuestionItem
                key={q.id}
                id={q.id}
                question={q.question}
                createdAt={q.createdAt}
                onChanged={() => {
                  void utils.questions.listInbox.invalidate();
                  void utils.questions.inboxCount.invalidate();
                  void utils.questions.listAnswered.invalidate({ profileUserId });
                }}
              />
            ))}
          </ul>
        </section>
      )}

      <AnsweredList
        items={answered.data ?? []}
        loading={answered.isLoading}
        isOwner={isOwner}
        profileUserId={profileUserId}
        canReact={canReact}
        reactionsByQuestion={reactions.data ?? {}}
        onShared={() => void utils.questions.listAnswered.invalidate({ profileUserId })}
      />
    </div>
  );
}

function AskLinkBanner({ username }: { username: string }) {
  return (
    <div className="voople-panel flex flex-wrap items-center justify-between gap-2 p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">Собирай анонимные вопросы</p>
        <p className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">Кинь ссылку в сторис, Roblox или чат — спросят анонимно</p>
      </div>
      <ShareButton
        url={`/${username}?ask=1`}
        title="Спроси меня анонимно"
        text="Задай мне анонимный вопрос в Voople 👀"
        label="Поделиться ссылкой"
      />
    </div>
  );
}

function AskQuestionForm({
  profileUserId,
  autoFocus,
  onAsked,
}: {
  profileUserId: string;
  autoFocus?: boolean;
  onAsked: () => void;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ask = trpc.questions.ask.useMutation({
    onSuccess: () => {
      setText("");
      setSent(true);
      onAsked();
    },
  });

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const trimmed = text.trim();

  return (
    <form
      className="voople-panel space-y-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        ask.mutate({ profileUserId, text: trimmed });
      }}
    >
      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
        <HelpCircle className="h-4 w-4 text-(--theme-accent)" />
        Задать анонимный вопрос
      </label>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value.slice(0, QUESTION_MAX_LENGTH));
          setSent(false);
        }}
        rows={3}
        placeholder="Спросите что угодно — автор не увидит, кто спрашивает"
        className="voople-input resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
          {sent ? "Вопрос отправлен" : `${trimmed.length}/${QUESTION_MAX_LENGTH}`}
        </span>
        <Button type="submit" size="sm" disabled={!trimmed || ask.isPending}>
          {ask.isPending ? "Отправка…" : "Отправить"}
        </Button>
      </div>
      {ask.error && <p className="text-xs text-red-400">{ask.error.message}</p>}
    </form>
  );
}

function InboxQuestionItem({
  id,
  question,
  createdAt,
  onChanged,
}: {
  id: string;
  question: string;
  createdAt: string;
  onChanged: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [answering, setAnswering] = useState(false);
  const answerMutation = trpc.questions.answer.useMutation({ onSuccess: onChanged });
  const hideMutation = trpc.questions.hide.useMutation({ onSuccess: onChanged });

  const trimmed = answer.trim();
  const busy = answerMutation.isPending || hideMutation.isPending;

  return (
    <li className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-black/20 p-3">
      <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_90%,transparent)]">{question}</p>
      <div className="mt-1 flex items-center gap-3 text-xs text-[color-mix(in_srgb,var(--foreground)_40%,transparent)]">
        <RelativeTime iso={createdAt} />
        {!answering && (
          <>
            <button
              type="button"
              className="text-(--theme-accent) hover:underline"
              onClick={() => setAnswering(true)}
            >
              Ответить
            </button>
            <button
              type="button"
              className="text-[color-mix(in_srgb,var(--foreground)_40%,transparent)] hover:text-red-400"
              disabled={busy}
              onClick={() => hideMutation.mutate({ questionId: id })}
            >
              Удалить
            </button>
          </>
        )}
      </div>

      {answering && (
        <div className="mt-2 space-y-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, ANSWER_MAX_LENGTH))}
            rows={2}
            autoFocus
            placeholder="Ваш публичный ответ"
            className="voople-input resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAnswering(false);
                setAnswer("");
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!trimmed || busy}
              onClick={() => answerMutation.mutate({ questionId: id, text: trimmed })}
            >
              {answerMutation.isPending ? "…" : "Опубликовать"}
            </Button>
          </div>
          {answerMutation.error && (
            <p className="text-xs text-red-400">{answerMutation.error.message}</p>
          )}
        </div>
      )}
    </li>
  );
}

function AnsweredList({
  items,
  loading,
  isOwner,
  profileUserId,
  canReact,
  reactionsByQuestion,
  onShared,
}: {
  items: { id: string; question: string; answer: string; answeredAt: string }[];
  loading: boolean;
  isOwner: boolean;
  profileUserId: string;
  canReact: boolean;
  reactionsByQuestion: Record<string, QuestionReaction[]>;
  onShared: () => void;
}) {
  if (loading) {
    return <p className="text-center text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">Загрузка…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]">Пока нет отвеченных вопросов</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((q) => (
        <AnsweredItem
          key={q.id}
          item={q}
          isOwner={isOwner}
          profileUserId={profileUserId}
          canReact={canReact}
          reactions={reactionsByQuestion[q.id] ?? []}
          onShared={onShared}
        />
      ))}
    </ul>
  );
}

function AnsweredItem({
  item,
  isOwner,
  profileUserId,
  canReact,
  reactions,
  onShared,
}: {
  item: { id: string; question: string; answer: string; answeredAt: string };
  isOwner: boolean;
  profileUserId: string;
  canReact: boolean;
  reactions: QuestionReaction[];
  onShared: () => void;
}) {
  const utils = trpc.useUtils();
  const share = trpc.questions.shareToFeed.useMutation({ onSuccess: onShared });
  const react = trpc.questions.toggleReaction.useMutation({
    onSuccess: (next) => {
      utils.questions.listReactions.setData({ profileUserId }, (prev) => ({
        ...(prev ?? {}),
        [item.id]: next,
      }));
    },
  });

  return (
    <li className="voople-panel space-y-2 p-4">
      <div className="flex items-start gap-2">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color-mix(in_srgb,var(--foreground)_30%,transparent)]" />
        <p className="text-sm text-[color-mix(in_srgb,var(--foreground)_70%,transparent)]">{item.question}</p>
      </div>
      <p className="whitespace-pre-wrap border-l-2 border-(--theme-accent) pl-3 text-sm text-[var(--foreground)]">
        {item.answer}
      </p>

      {reactions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reactions.map((reaction) => {
            const active = reaction.reactedByViewer;
            const empty = reaction.count === 0;
            if (empty && !canReact) return null;
            return (
              <button
                key={reaction.emoji}
                type="button"
                disabled={!canReact || react.isPending}
                onClick={() => react.mutate({ questionId: item.id, emoji: reaction.emoji })}
                aria-pressed={active}
                aria-label={`Реакция ${reaction.emoji}`}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors disabled:cursor-default",
                  active
                    ? "border-[color-mix(in_srgb,var(--theme-accent)_45%,transparent)] bg-[var(--app-accent-soft)] text-[var(--foreground)]"
                    : "border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[color-mix(in_srgb,var(--foreground)_72%,transparent)] hover:border-[var(--app-border-strong)] enabled:hover:text-[var(--foreground)]",
                )}
              >
                <span aria-hidden>{reaction.emoji}</span>
                {reaction.count > 0 && (
                  <span className="tabular-nums text-[color-mix(in_srgb,var(--foreground)_60%,transparent)]">{reaction.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <RelativeTime iso={item.answeredAt} className="text-xs text-[color-mix(in_srgb,var(--foreground)_50%,transparent)]" />
        {isOwner && (
          <button
            type="button"
            disabled={share.isPending || share.isSuccess}
            onClick={() => share.mutate({ questionId: item.id })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-(--theme-accent) transition hover:opacity-80 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {share.isSuccess ? "В ленте" : share.isPending ? "…" : "В ленту"}
          </button>
        )}
      </div>
    </li>
  );
}
