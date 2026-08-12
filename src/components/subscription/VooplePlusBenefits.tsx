import { Check, History, MessageCircleMore, Palette, Rocket, Sparkles, UsersRound } from "lucide-react";

import { VOOPLUS_FEATURE_GROUPS } from "@/lib/constants/subscription";
import { vooplusBadgeStaticUrl } from "@/lib/constants/vooplus-badge";
import { cn } from "@/lib/utils";

const ICONS = {
  identity: Sparkles,
  comfort: Palette,
  groups: UsersRound,
} as const;

function BenefitVisual({ groupId }: { groupId: (typeof VOOPLUS_FEATURE_GROUPS)[number]["id"] }) {
  if (groupId === "identity") {
    return (
      <div className="voople-plus-benefit-card__visual voople-plus-benefit-card__visual--identity" aria-hidden>
        <span>
          {/* eslint-disable-next-line @next/next/no-img-element -- public CDN subscription pin */}
          <img className="voople-plus-pin__image" src={vooplusBadgeStaticUrl()} alt="" width={42} height={42} />
        </span>
        <strong>Имя в твоём стиле</strong>
        <span>Вупл+</span>
      </div>
    );
  }
  if (groupId === "comfort") {
    return (
      <div className="voople-plus-benefit-card__visual voople-plus-benefit-card__visual--comfort" aria-hidden>
        <span><MessageCircleMore className="h-4 w-4" /> Аврора</span>
        <span><History className="h-4 w-4" /> 12 образов</span>
      </div>
    );
  }
  return (
    <div className="voople-plus-benefit-card__visual voople-plus-benefit-card__visual--groups" aria-hidden>
      <Rocket className="h-5 w-5" />
      <span><strong>Свои</strong> · буст активен</span>
      <i />
    </div>
  );
}

export function VooplePlusBenefits({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("voople-plus-benefits", compact && "voople-plus-benefits--compact")}>
      {VOOPLUS_FEATURE_GROUPS.map((group) => {
        const Icon = ICONS[group.id];
        return (
          <section key={group.id} className="voople-plus-benefit-card">
            <span className="voople-plus-benefit-card__icon" aria-hidden>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <h3>{group.title}</h3>
              {!compact ? <p>{group.description}</p> : null}
              <ul>
                {group.features.map((feature) => (
                  <li key={feature}>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            {!compact ? <BenefitVisual groupId={group.id} /> : null}
          </section>
        );
      })}
    </div>
  );
}
