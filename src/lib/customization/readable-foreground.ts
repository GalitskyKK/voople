/** Относительная яркость HEX-цвета (0..1). */
function hexLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (normalized.length < 6) return 0;
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Читаемый цвет текста для карточки с кастомным фоном: тёмный текст на светлом
 * фоне, светлый — на тёмном. Используется как переопределение `--foreground`,
 * на который завязан весь текст внутри карточки профиля.
 *
 * Принимает один или два HEX-цвета (для градиента берётся средняя яркость).
 */
export function readableForeground(...backgroundHex: string[]): string {
  if (backgroundHex.length === 0) return "#f4f4f7";
  const avg =
    backgroundHex.reduce((sum, hex) => sum + hexLuminance(hex), 0) / backgroundHex.length;
  return avg > 0.6 ? "#16161c" : "#f4f4f7";
}
