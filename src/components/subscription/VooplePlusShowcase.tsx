import { History, MessageCircleMore, Palette, Rocket, Sparkles } from "lucide-react";

import { VooplePlusBadge } from "@/components/subscription/VooplePlusFeatureSurface";
import { vooplusBadgeStaticUrl } from "@/lib/constants/vooplus-badge";

export function VooplePlusShowcase() {
  return (
    <div className="voople-plus-stage" aria-label="Возможности Вупл+ в интерфейсе">
      <div className="voople-plus-stage__ambient" aria-hidden />

      <section className="voople-plus-stage__chat" aria-label="Фон диалога Аврора">
        <header>
          <span className="voople-plus-stage__icon"><MessageCircleMore className="h-4 w-4" /></span>
          <div>
            <strong>Диалог по настроению</strong>
            <span>Фон «Аврора»</span>
          </div>
        </header>
        <div className="voople-plus-stage__messages">
          <span>Ты где?</span>
          <span>Уже здесь</span>
          <span>Залетаю в комнату</span>
        </div>
      </section>

      <section className="voople-plus-stage__identity" aria-label="Стиль имени и пин Вупл+">
        <div className="voople-plus-stage__logo" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- public CDN subscription pin */}
          <img className="voople-plus-pin__image" src={vooplusBadgeStaticUrl()} alt="" width={42} height={42} />
        </div>
        <div className="min-w-0">
          <span className="voople-plus-stage__eyebrow"><Sparkles className="h-3 w-3" /> Стиль имени</span>
          <strong className="voople-plus-stage__name">Имя в твоём стиле</strong>
        </div>
        <VooplePlusBadge />
      </section>

      <section className="voople-plus-stage__themes" aria-label="Цветовые темы Вупл+">
        <header><Palette className="h-4 w-4" aria-hidden /> Темы приложения</header>
        <div aria-hidden>
          <span data-theme="violet" />
          <span data-theme="rose" />
          <span data-theme="emerald" />
          <span data-theme="gold" />
        </div>
      </section>

      <section className="voople-plus-stage__history" aria-label="История недавних аватаров">
        <History className="h-4 w-4" aria-hidden />
        <div>
          <strong>12 образов</strong>
          <span>Недавние аватары под рукой</span>
        </div>
        <div className="voople-plus-stage__avatars" aria-hidden>
          <span>В</span><span>У</span><span>П</span>
        </div>
      </section>

      <section className="voople-plus-stage__boost" aria-label="Буст группы">
        <span className="voople-plus-stage__icon"><Rocket className="h-4 w-4" /></span>
        <div>
          <strong>Своя группа</strong>
          <span>Буст активен · цвет выбран</span>
        </div>
        <span className="voople-plus-stage__boost-status">+1</span>
      </section>
    </div>
  );
}
