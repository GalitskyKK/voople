"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { TEAM_PINS, TEAM_PIN_IDS, type TeamPinId } from "@/lib/badges/registry";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { BadgeArtwork } from "@/components/profile/BadgeArtwork";

const QUESTIONS: Array<{ title: string; options: Record<TeamPinId, string> }> = [
  { title: "В незнакомой компании ты скорее…", options: { "team-pulse": "считываю настроение", "team-orbit": "знакомлю людей", "team-forge": "предлагаю, что сделать", "team-echo": "слушаю и замечаю детали" } },
  { title: "Хороший пост для тебя — это…", options: { "team-pulse": "честная эмоция", "team-orbit": "повод заговорить", "team-forge": "сильная идея", "team-echo": "точная мысль" } },
  { title: "Когда появляется идея…", options: { "team-pulse": "ловлю её настроение", "team-orbit": "зову единомышленников", "team-forge": "сразу собираю прототип", "team-echo": "докручиваю смысл" } },
  { title: "В команде на тебя рассчитывают, потому что ты…", options: { "team-pulse": "чувствуешь людей", "team-orbit": "объединяешь", "team-forge": "доводишь до результата", "team-echo": "видишь то, что пропустили" } },
  { title: "Твой идеальный вечер…", options: { "team-pulse": "музыка и живые эмоции", "team-orbit": "люди и новые знакомства", "team-forge": "делать личный проект", "team-echo": "разговор один на один" } },
];

export function TeamPinQuiz() {
  const utils = trpc.useUtils();
  const badges = trpc.engagement.myBadges.useQuery();
  const [answers, setAnswers] = useState<TeamPinId[]>([]);
  const [result, setResult] = useState<TeamPinId | null>(null);
  const choose = trpc.engagement.chooseTeam.useMutation({
    onSuccess: (pin) => {
      setResult(pin);
      void Promise.all([
        utils.engagement.badges.invalidate(),
        utils.engagement.myBadges.invalidate(),
      ]);
    },
  });
  const step = Math.min(answers.length, QUESTIONS.length - 1);
  const question = QUESTIONS[step];

  const existingResult = result ?? TEAM_PIN_IDS.find((id) => badges.data?.includes(id)) ?? null;

  if (existingResult) {
    const pin = TEAM_PINS[existingResult];
    return (
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--theme-accent)_35%,var(--app-border))] bg-[var(--app-accent-soft)] p-4">
        <div className="flex items-center gap-3">
          <BadgeArtwork badge={pin} className="h-14 w-14 shrink-0" />
          <div><p className="font-semibold">Твоя команда — {pin.label}</p><p className="text-sm text-[var(--app-muted)]">{pin.description}</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="font-semibold">Найди свою команду</p><p className="text-sm text-[var(--app-muted)]">Пять ситуаций — один постоянный пин в профиле.</p></div>
        <span className="text-xs tabular-nums text-[var(--app-muted)]">{answers.length + 1}/5</span>
      </div>
      <p className="mb-3 text-sm font-medium">{question.title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TEAM_PIN_IDS.map((pinId) => (
          <button
            key={pinId}
            type="button"
            disabled={choose.isPending}
            onClick={() => {
              const next = [...answers, pinId];
              setAnswers(next);
              if (next.length === QUESTIONS.length) choose.mutate({ answers: next });
            }}
            className={cn("flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 text-left text-sm transition hover:border-[var(--theme-accent)] hover:bg-[var(--app-accent-soft)]")}
          >
            <BadgeArtwork badge={TEAM_PINS[pinId]} className="h-6 w-6 shrink-0" />
            {question.options[pinId]}
          </button>
        ))}
      </div>
      {answers.length > 0 ? <button type="button" onClick={() => setAnswers((old) => old.slice(0, -1))} className="mt-3 text-xs text-[var(--app-muted)] hover:text-[var(--foreground)]">Назад</button> : null}
      {choose.isPending ? <p className="mt-3 flex items-center gap-2 text-xs text-[var(--app-muted)]"><Sparkles className="h-3.5 w-3.5" /> Определяем команду…</p> : null}
      {choose.error ? <p className="mt-3 text-xs text-red-400">{choose.error.message}</p> : null}
    </div>
  );
}
