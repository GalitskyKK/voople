import type { ChatUploadKind } from "./chat-mime";

/**
 * Определяет реальную категорию файла по магическим байтам (file signature),
 * не доверяя заявленному клиентом Content-Type. Возвращает `null`, если
 * сигнатура не распознана.
 *
 * Применяется там, где байты проходят через сервер (chat upload route), чтобы
 * исключить подмену типа (например, HTML/скрипт с заголовком `image/png`).
 */
export function sniffUploadKind(bytes: Uint8Array): ChatUploadKind | null {
  if (isImageSignature(bytes)) return "image";
  if (isAudioSignature(bytes)) return "audio";
  return null;
}

function matches(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

/** Все 4 байта в позиции offset совпадают с ASCII-строкой. */
function matchesAscii(bytes: Uint8Array, offset: number, ascii: string): boolean {
  return matches(
    bytes,
    offset,
    Array.from(ascii, (ch) => ch.charCodeAt(0)),
  );
}

function isImageSignature(bytes: Uint8Array): boolean {
  // JPEG
  if (matches(bytes, 0, [0xff, 0xd8, 0xff])) return true;
  // PNG
  if (matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true;
  // GIF87a / GIF89a
  if (matchesAscii(bytes, 0, "GIF8")) return true;
  // WEBP = RIFF....WEBP
  if (matchesAscii(bytes, 0, "RIFF") && matchesAscii(bytes, 8, "WEBP")) return true;
  return false;
}

function isAudioSignature(bytes: Uint8Array): boolean {
  // MP3 с ID3-тегом
  if (matchesAscii(bytes, 0, "ID3")) return true;
  // MP3 frame sync (0xFF 0xEx/0xFx)
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;
  // OGG
  if (matchesAscii(bytes, 0, "OggS")) return true;
  // WAV = RIFF....WAVE
  if (matchesAscii(bytes, 0, "RIFF") && matchesAscii(bytes, 8, "WAVE")) return true;
  // MP4 / M4A = ....ftyp
  if (matchesAscii(bytes, 4, "ftyp")) return true;
  // WebM / Matroska (EBML)
  if (matches(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) return true;
  return false;
}
