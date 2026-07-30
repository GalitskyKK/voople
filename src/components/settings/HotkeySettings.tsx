"use client";

import { useState } from "react";
import { Info, Plus, TriangleAlert, Trash2 } from "lucide-react";

import {
  HOTKEY_ACTIONS,
  createHotkeyBinding,
  hotkeyFromKeyboardEvent,
  isReservedHotkey,
  type HotkeyAction,
  type HotkeyBinding,
} from "@/lib/hotkeys";

const ACTION_GROUPS = ["Основные", "Голос и видео"] as const;

export type HotkeyRuntimeStatus = {
  mode: "idle" | "local" | "registering" | "ready" | "suspended" | "error";
  registeredCount: number;
  failures: Array<{ shortcut: string; message: string }>;
};

export function HotkeySettings({
  hotkeys,
  onChange,
  runtimeStatus,
}: {
  hotkeys: HotkeyBinding[];
  onChange: (value: HotkeyBinding[]) => void;
  runtimeStatus?: HotkeyRuntimeStatus;
}) {
  const [capturing, setCapturing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateBinding = (id: string, patch: Partial<HotkeyBinding>) => {
    onChange(hotkeys.map((binding) => (
      binding.id === id ? { ...binding, ...patch } : binding
    )));
  };

  const capture = (
    binding: HotkeyBinding,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") {
      setCapturing(null);
      setError(null);
      return;
    }

    const shortcut = hotkeyFromKeyboardEvent(event.nativeEvent);
    if (!shortcut) {
      setError("Добавьте Ctrl, Alt или Shift. Отдельно можно назначить только F1–F12.");
      return;
    }
    if (isReservedHotkey(shortcut)) {
      setError("Это системное сочетание зарезервировано.");
      return;
    }

    const conflict = hotkeys.find(
      (item) => item.id !== binding.id && item.shortcut === shortcut,
    );
    if (conflict) {
      const action = HOTKEY_ACTIONS.find(({ id }) => id === conflict.action);
      setError(`Сочетание уже используется: «${action?.label ?? "другое действие"}».`);
      return;
    }

    updateBinding(binding.id, { shortcut, enabled: true });
    setCapturing(null);
    setError(null);
  };

  const addBinding = () => {
    const binding = createHotkeyBinding();
    onChange([...hotkeys, binding]);
    setCapturing(binding.id);
    setError(null);
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(
        `[data-hotkey-id="${binding.id}"]`,
      )?.focus();
    });
  };

  return (
    <div className="space-y-3">
      <div className="settings-hotkey-notice">
        <Info className="h-4 w-4" />
        <p>
          {runtimeStatus?.mode === "suspended"
            ? "Пока открыта эта страница, глобальные горячие клавиши приостановлены."
            : runtimeStatus?.mode === "ready"
              ? `Глобальные горячие клавиши работают при свёрнутом Voople. Зарегистрировано: ${runtimeStatus.registeredCount}.`
              : runtimeStatus?.mode === "registering"
                ? "Регистрируем глобальные горячие клавиши…"
                : runtimeStatus?.mode === "error"
                  ? `Глобальные клавиши активны частично. Зарегистрировано: ${runtimeStatus.registeredCount}.`
                  : "В веб-версии сочетания работают только при активном окне."}
        </p>
      </div>
      {runtimeStatus?.failures.length ? (
        <div className="settings-hotkey-warning" role="alert">
          <TriangleAlert className="h-4 w-4" />
          <div>
            <p>Некоторые сочетания заняты системой или другой программой:</p>
            <p>{runtimeStatus.failures.map(({ shortcut }) => shortcut).join(", ")}</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-xs leading-5 text-[var(--app-muted)]">
          Для одного действия можно добавить несколько сочетаний.
        </p>
        <button type="button" className="settings-hotkey-add" onClick={addBinding}>
          <Plus className="h-4 w-4" />
          Добавить сочетание
        </button>
      </div>

      <div className="settings-hotkey-list">
        {hotkeys.map((binding) => {
          const active = capturing === binding.id;
          const definition = HOTKEY_ACTIONS.find(({ id }) => id === binding.action);
          return (
            <div className="settings-hotkey-binding" key={binding.id}>
              <label className="settings-hotkey-field">
                <span>Действие</span>
                <select
                  value={binding.action}
                  onChange={(event) => updateBinding(binding.id, {
                    action: event.target.value as HotkeyAction,
                  })}
                >
                  {ACTION_GROUPS.map((group) => (
                    <optgroup label={group} key={group}>
                      {HOTKEY_ACTIONS.filter((action) => action.group === group).map(
                        (action) => (
                          <option value={action.id} key={action.id}>
                            {action.label}
                          </option>
                        ),
                      )}
                    </optgroup>
                  ))}
                </select>
                <small>{definition?.description}</small>
              </label>

              <div className="settings-hotkey-field">
                <span>Горячие клавиши</span>
                <button
                  type="button"
                  data-hotkey-id={binding.id}
                  className="settings-hotkey-capture"
                  aria-label={`Изменить сочетание: ${definition?.label ?? "действие"}`}
                  aria-pressed={active}
                  onClick={() => {
                    setCapturing(binding.id);
                    setError(null);
                  }}
                  onBlur={() => setCapturing((current) => (
                    current === binding.id ? null : current
                  ))}
                  onKeyDown={active ? (event) => capture(binding, event) : undefined}
                >
                  {active
                    ? "Нажмите клавиши…"
                    : binding.shortcut
                      ? <kbd>{binding.shortcut}</kbd>
                      : "Назначить"}
                </button>
              </div>

              <label className="settings-hotkey-enabled">
                <span className="sr-only">Включить сочетание</span>
                <input
                  type="checkbox"
                  className="settings-switch"
                  checked={binding.enabled}
                  disabled={!binding.shortcut}
                  onChange={(event) => updateBinding(binding.id, {
                    enabled: event.target.checked,
                  })}
                />
              </label>
              <button
                type="button"
                className="settings-hotkey-delete"
                aria-label={`Удалить сочетание: ${definition?.label ?? "действие"}`}
                onClick={() => onChange(hotkeys.filter(({ id }) => id !== binding.id))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="text-xs text-red-400" role="alert">{error}</p>
      ) : (
        <p className="text-xs text-[var(--app-muted)]">
          Escape отменяет запись. Системные сочетания вроде Alt+F4 недоступны.
        </p>
      )}
    </div>
  );
}
