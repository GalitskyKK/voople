"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HelpCircle, Send } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/Button";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { ShareButton } from "@/components/ui/ShareButton";

const QUESTION_MAX_LENGTH = 500;
const ANSWER_MAX_LENGTH = 1000;

type ProfileQuestionsProps = {
  profileUserId: string;
  username: string;
  isOwner: boolean;
  /** Залогиненный посетитель (не владелец) может задавать вопросы. */
  canAsk: boolean;
  /** Сфокусировать форму вопроса при заходе по ask-ссылке. */
  autoFocusAsk?: boolean;
};

export function ProfileQuestions({
  profileUserId,
  username,
  isOwner,
  canAsk,
  autoFocusAsk = false,
}: ProfileQuestionsProps) {
  const utils = trpc.useUtils();

  const answered = trpc.questions.listAnswered.useQuery({ profileUserId });
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
        <Link
          href="/login"
          className="voople-panel flex items-center gap-2 p-4 text-sm text-white/70 transition hover:text-white"
        >
          <HelpCircle className="h-4 w-4 text-(--theme-accent)" />
          Войдите, чтобы задать анонимный вопрос
        </Link>
      )}

      {isOwner && inbox.data && inbox.data.length > 0 && (
        <section className="voople-panel space-y-3 p-4">
          <h3 className="text-sm font-semibold text-white">
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
        onShared={() => void utils.questions.listAnswered.invalidate({ profileUserId })}
      />
    </div>
  );
}

function AskLinkBanner({ username }: { username: string }) {
  return (
    <div className="voople-panel flex flex-wrap items-center justify-between gap-2 p-4">
      <div>
        <p className="text-sm font-semibold text-white">Собирай анонимные вопросы</p>
        <p className="text-xs text-white/50">Кинь ссылку в сторис, Roblox или чат — спросят анонимно</p>
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
      <label className="flex items-center gap-2 text-sm font-semibold text-white">
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
        className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-(--theme-accent) focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white/40">
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
    <li className="rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-sm text-white/90">{question}</p>
      <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
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
              className="text-white/40 hover:text-red-400"
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
            className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-(--theme-accent) focus:outline-none"
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
  onShared,
}: {
  items: { id: string; question: string; answer: string; answeredAt: string }[];
  loading: boolean;
  isOwner: boolean;
  onShared: () => void;
}) {
  if (loading) {
    return <p className="text-center text-sm text-white/50">Загрузка…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-white/50">Пока нет отвеченных вопросов</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((q) => (
        <AnsweredItem key={q.id} item={q} isOwner={isOwner} onShared={onShared} />
      ))}
    </ul>
  );
}

function AnsweredItem({
  item,
  isOwner,
  onShared,
}: {
  item: { id: string; question: string; answer: string; answeredAt: string };
  isOwner: boolean;
  onShared: () => void;
}) {
  const share = trpc.questions.shareToFeed.useMutation({ onSuccess: onShared });

  return (
    <li className="voople-panel space-y-2 p-4">
      <div className="flex items-start gap-2">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
        <p className="text-sm text-white/70">{item.question}</p>
      </div>
      <p className="whitespace-pre-wrap border-l-2 border-(--theme-accent) pl-3 text-sm text-white">
        {item.answer}
      </p>
      <div className="flex items-center justify-between gap-2">
        <RelativeTime iso={item.answeredAt} className="text-xs text-white/50" />
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
