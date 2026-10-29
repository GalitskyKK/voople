import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

test("Orbit defaults for fresh/older preferences while an explicit Classic choice persists", async () => {
  const previousWindow = globalThis.window;
  let raw = null;
  globalThis.window = { localStorage: { getItem: () => raw, setItem: (_key, value) => { raw = value; } }, dispatchEvent: () => {} };
  let code = ts.transpileModule(readFileSync("src/lib/app-preferences.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  code = code.replace(/import \{[^}]+\} from "@\/lib\/hotkeys";/, "const DEFAULT_HOTKEY_BINDINGS = []; const sanitizeHotkeys = () => [];")
    .replace(/import \{ normalizeSoundPack \} from "@\/lib\/sound\/sound-catalog";/, 'const normalizeSoundPack = () => "default";');
  try {
    const { readAppPreferences, writeAppPreferences, DEFAULT_APP_PREFERENCES } = await import(`data:text/javascript,${encodeURIComponent(code)}`);
    assert.equal(DEFAULT_APP_PREFERENCES.interfaceDesign, "orbit");
    assert.equal(readAppPreferences().interfaceDesign, "orbit");
    raw = JSON.stringify({ density: "compact" });
    assert.equal(readAppPreferences().interfaceDesign, "orbit");
    assert.equal(readAppPreferences().density, "compact");
    raw = JSON.stringify({ interfaceDesign: "unknown" });
    assert.equal(readAppPreferences().interfaceDesign, "orbit");
    writeAppPreferences({ ...readAppPreferences(), interfaceDesign: "classic" });
    assert.equal(JSON.parse(raw).interfaceDesign, "classic");
    assert.equal(readAppPreferences().interfaceDesign, "classic");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
