import { Check, Crown, SmilePlus, Sparkles, Volume2 } from "lucide-react";

const LEVELS = [
  { boosts: 1, title: "Свой цвет", emoji: 20, sounds: 0, perks: ["Цвет интерфейса группы", "Фон приглашения"] },
  { boosts: 3, title: "Живая иконка", emoji: 50, sounds: 8, perks: ["Анимированная иконка"] },
  { boosts: 6, title: "Баннер", emoji: 100, sounds: 16, perks: ["Баннер группы", "Файлы до 50 МБ"] },
  { boosts: 12, title: "Стиль группы", emoji: 150, sounds: 32, perks: ["Анимированный баннер", "Тег группы", "Файлы до 100 МБ"] },
  { boosts: 24, title: "Полный уровень", emoji: 250, sounds: 48, perks: ["Vanity-ссылка", "Расширенные стили ролей", "1080p / 60 FPS"] },
] as const;

export function VooplePlusGroupLevels() {
  return (
    <section className="voople-plus-levels" aria-labelledby="voople-plus-levels-title">
      <div className="voople-plus-levels__heading">
        <span><Crown className="h-4 w-4" aria-hidden /> Уровни группы</span>
        <h2 id="voople-plus-levels-title">Три твоих буста.<br />Общий результат группы.</h2>
        <p>Каждый подписчик распределяет три слота. Чем больше участников поддерживают пространство, тем больше возможностей открывается всем.</p>
      </div>
      <div className="voople-plus-levels__grid">
        {LEVELS.map((level) => (
          <article key={level.boosts} className="voople-plus-level-card">
            <header><span>{level.boosts}</span><div><strong>{level.title}</strong><small>{level.boosts === 1 ? "буст" : "бустов"}</small></div></header>
            <ul>
              <li><SmilePlus className="h-3.5 w-3.5" />{level.emoji} эмодзи</li>
              {level.sounds ? <li><Volume2 className="h-3.5 w-3.5" />{level.sounds} звуков</li> : null}
              {level.perks.map((perk) => <li key={perk}><Check className="h-3.5 w-3.5" />{perk}</li>)}
            </ul>
          </article>
        ))}
      </div>
      <p className="voople-plus-levels__base"><Sparkles className="h-4 w-4" /> Без бустов у группы остаются 10 статичных эмодзи.</p>
    </section>
  );
}
