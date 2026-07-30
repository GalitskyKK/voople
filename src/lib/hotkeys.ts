export const HOTKEY_ACTIONS = [
  {
    id: "newPost",
    label: "Новый пост",
    description: "Открывает редактор нового поста.",
    group: "Основные",
    defaultShortcut: "Ctrl+Shift+N",
  },
  {
    id: "search",
    label: "Открыть поиск",
    description: "Переходит в раздел поиска.",
    group: "Основные",
    defaultShortcut: "Ctrl+K",
  },
  {
    id: "messages",
    label: "Открыть сообщения",
    description: "Переходит к списку чатов.",
    group: "Основные",
    defaultShortcut: "Ctrl+Shift+C",
  },
  {
    id: "settings",
    label: "Открыть настройки",
    description: "Открывает настройки приложения.",
    group: "Основные",
    defaultShortcut: "Ctrl+,",
  },
  {
    id: "toggleMicrophone",
    label: "Вкл./выкл. микрофон",
    description: "Переключает микрофон в активном голосовом чате.",
    group: "Голос и видео",
    defaultShortcut: "Ctrl+Shift+M",
  },
  {
    id: "toggleVoiceSound",
    label: "Вкл./выкл. звук собеседников",
    description: "Отключает или возвращает входящий звук активного разговора.",
    group: "Голос и видео",
    defaultShortcut: "Ctrl+Shift+D",
  },
  {
    id: "openVoicePanel",
    label: "Открыть панель голосового чата",
    description: "Показывает участников и настройки текущего разговора.",
    group: "Голос и видео",
    defaultShortcut: "Ctrl+Shift+B",
  },
  {
    id: "leaveVoiceRoom",
    label: "Выйти из голосового чата",
    description: "Завершает ваше участие в текущем разговоре.",
    group: "Голос и видео",
    defaultShortcut: "Ctrl+Shift+L",
  },
] as const;

export type HotkeyAction = (typeof HOTKEY_ACTIONS)[number]["id"];
export type HotkeyBinding = {
  id: string;
  action: HotkeyAction;
  shortcut: string;
  enabled: boolean;
};

export const DEFAULT_HOTKEY_BINDINGS: HotkeyBinding[] = HOTKEY_ACTIONS.map(
  ({ id, defaultShortcut }) => ({
    id: `default:${id}`,
    action: id,
    shortcut: defaultShortcut,
    enabled: true,
  }),
);

const ACTION_IDS = new Set<HotkeyAction>(HOTKEY_ACTIONS.map(({ id }) => id));
const RESERVED_HOTKEYS = new Set([
  "Alt+F4",
  "Ctrl+R",
  "Ctrl+Shift+I",
  "Ctrl+W",
  "F5",
  "F12",
]);

function keyFromCode(code: string, key: string) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F(?:[1-9]|1[0-2])$/.test(code)) return code;

  const namedKeys: Record<string, string> = {
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    Backquote: "`",
    Backslash: "\\",
    BracketLeft: "[",
    BracketRight: "]",
    Comma: ",",
    Equal: "=",
    Minus: "-",
    Period: ".",
    Semicolon: ";",
    Slash: "/",
    Space: "Space",
  };

  return namedKeys[code] ?? (key.length === 1 ? key.toUpperCase() : key);
}

export function hotkeyFromKeyboardEvent(event: KeyboardEvent): string | null {
  if (["Alt", "Control", "Meta", "Shift"].includes(event.key)) return null;

  const key = keyFromCode(event.code, event.key);
  const modifiers = [
    event.ctrlKey ? "Ctrl" : null,
    event.altKey ? "Alt" : null,
    event.shiftKey ? "Shift" : null,
    event.metaKey ? "Meta" : null,
  ].filter(Boolean);

  if (modifiers.length === 0 && !/^F(?:[1-9]|1[0-2])$/.test(key)) return null;
  return [...modifiers, key].join("+");
}

export function isReservedHotkey(hotkey: string) {
  return RESERVED_HOTKEYS.has(hotkey);
}

export function matchesHotkey(event: KeyboardEvent, hotkey: string) {
  return hotkeyFromKeyboardEvent(event) === hotkey;
}

export function isEditableHotkeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

export function createHotkeyBinding(): HotkeyBinding {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `hotkey:${Date.now()}`,
    action: "toggleMicrophone",
    shortcut: "",
    enabled: false,
  };
}

export function sanitizeHotkeys(value: unknown): HotkeyBinding[] {
  if (!Array.isArray(value)) return DEFAULT_HOTKEY_BINDINGS;

  const seenIds = new Set<string>();
  const bindings = value.slice(0, 32).flatMap((item): HotkeyBinding[] => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<HotkeyBinding>;
    if (
      typeof candidate.id !== "string" ||
      seenIds.has(candidate.id) ||
      !ACTION_IDS.has(candidate.action as HotkeyAction) ||
      typeof candidate.shortcut !== "string" ||
      (candidate.shortcut && isReservedHotkey(candidate.shortcut))
    ) {
      return [];
    }
    seenIds.add(candidate.id);
    return [{
      id: candidate.id,
      action: candidate.action as HotkeyAction,
      shortcut: candidate.shortcut,
      enabled: candidate.enabled === true && candidate.shortcut.length > 0,
    }];
  });

  return bindings.length > 0 ? bindings : DEFAULT_HOTKEY_BINDINGS;
}
