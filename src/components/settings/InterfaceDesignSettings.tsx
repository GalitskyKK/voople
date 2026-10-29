"use client";

import { PanelsTopLeft } from "lucide-react";
import { useAppPreferences } from "./AppPreferencesProvider";

const designs = [
  { id: "classic", name: "Классический", description: "Привычная панель переписок и комнаты списком." },
  { id: "orbit", name: "Орбита", description: "Компактная панель, комнаты с обложками и отдельный войсдок." },
] as const;

export function InterfaceDesignSettings() {
  const { preferences, updatePreferences } = useAppPreferences();
  return <section className="settings-section" aria-labelledby="interface-design-title">
    <div className="settings-section__header">
      <PanelsTopLeft className="h-5 w-5" aria-hidden="true" />
      <div><h2 id="interface-design-title">Дизайн интерфейса</h2><p>Можно переключить в любой момент. Выбор сохраняется на этом устройстве.</p></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Дизайн интерфейса">
      {designs.map((design) => <button key={design.id} type="button"
        aria-pressed={preferences.interfaceDesign === design.id}
        onClick={() => updatePreferences({ interfaceDesign: design.id })}
        className="voople-design-option">
        <span className="voople-design-option__preview" data-design={design.id} aria-hidden="true">
          <span className="voople-design-option__rail"><i /><i /><i /></span>
          <span className="voople-design-option__rooms"><i /><i /><i /><i /></span>
          <span className="voople-design-option__chat"><i /><i /><i /></span>
        </span>
        <span className="block text-sm font-semibold">{design.name}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">{design.description}</span>
      </button>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-[var(--app-muted)]">Темы и размер текста работают в обоих вариантах. Переключение не прерывает разговор.</p>
  </section>;
}
