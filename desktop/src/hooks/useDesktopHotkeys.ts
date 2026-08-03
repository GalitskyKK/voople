import { useEffect, useReducer, useRef } from "react";
import {
  isRegistered,
  register,
  unregister,
  type ShortcutEvent,
} from "@tauri-apps/plugin-global-shortcut";

import {
  isEditableHotkeyTarget,
  matchesHotkey,
  type HotkeyBinding,
  type HotkeyAction,
} from "@/lib/hotkeys";

import {
  getGlobalHotkeyStatus,
  setGlobalHotkeyStatus,
} from "../hotkeys/global-hotkey-status";

type DesktopHotkeyActions = Record<HotkeyAction, () => void>;

let registrationQueue = Promise.resolve();
let registeredShortcuts: string[] = [];
let registrationGeneration = 0;

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

async function unregisterCurrentShortcuts() {
  const shortcuts = registeredShortcuts;
  registeredShortcuts = [];
  if (shortcuts.length > 0) await unregister(shortcuts);
}

export function useDesktopHotkeys(
  hotkeys: HotkeyBinding[],
  actions: DesktopHotkeyActions,
  suspended: boolean,
) {
  const actionsRef = useRef(actions);
  const [registrationEpoch, refreshRegistration] = useReducer(
    (value: number) => value + 1,
    0,
  );

  useEffect(() => {
    if (!isTauriRuntime() || suspended) return;

    let checking = false;
    const verifyRegistrations = async () => {
      if (checking || registeredShortcuts.length === 0) return;
      checking = true;
      try {
        const states = await Promise.all(
          registeredShortcuts.map((shortcut) => isRegistered(shortcut)),
        );
        if (states.some((registered) => !registered)) refreshRegistration();
      } catch {
        refreshRegistration();
      } finally {
        checking = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void verifyRegistrations();
    };

    window.addEventListener("focus", verifyRegistrations);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", verifyRegistrations);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [suspended]);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    const bindings = hotkeys.filter(
      ({ enabled, shortcut }) => enabled && shortcut,
    );

    if (!isTauriRuntime()) {
      setGlobalHotkeyStatus({
        mode: suspended ? "suspended" : "local",
        registeredCount: 0,
        failures: [],
      });
      if (suspended) return;

      const onKeyDown = (event: KeyboardEvent) => {
        if (
          event.defaultPrevented ||
          event.repeat ||
          isEditableHotkeyTarget(event.target)
        ) {
          return;
        }
        const matched = bindings.find(({ shortcut }) =>
          matchesHotkey(event, shortcut),
        );
        if (!matched) return;
        event.preventDefault();
        actionsRef.current[matched.action]();
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }

    let cancelled = false;
    const generation = ++registrationGeneration;
    const previousFailures = getGlobalHotkeyStatus().failures;
    setGlobalHotkeyStatus({
      mode: suspended ? "suspended" : "registering",
      registeredCount: 0,
      failures: suspended ? previousFailures : [],
    });

    registrationQueue = registrationQueue.then(async () => {
      await unregisterCurrentShortcuts().catch(() => undefined);
      if (cancelled || generation !== registrationGeneration || suspended) return;

      const registered: string[] = [];
      const failures: Array<{ shortcut: string; message: string }> = [];
      for (const binding of bindings) {
        if (cancelled || generation !== registrationGeneration) break;
        try {
          await register(binding.shortcut, (event: ShortcutEvent) => {
            if (event.state === "Pressed") {
              actionsRef.current[binding.action]();
            }
          });
          if (!(await isRegistered(binding.shortcut))) {
            throw new Error("Система не подтвердила регистрацию сочетания");
          }
          registered.push(binding.shortcut);
        } catch (error) {
          failures.push({
            shortcut: binding.shortcut,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (cancelled || generation !== registrationGeneration) {
        if (registered.length > 0) await unregister(registered).catch(() => undefined);
        return;
      }

      registeredShortcuts = registered;
      setGlobalHotkeyStatus({
        mode: failures.length > 0 ? "error" : "ready",
        registeredCount: registered.length,
        failures,
      });
    });

    return () => {
      cancelled = true;
      if (generation === registrationGeneration) registrationGeneration += 1;
      registrationQueue = registrationQueue.then(() =>
        unregisterCurrentShortcuts().catch(() => undefined),
      );
    };
  }, [hotkeys, registrationEpoch, suspended]);
}
