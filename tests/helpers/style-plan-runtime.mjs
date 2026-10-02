import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const moduleUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      "server-only": "export {};",
      "@/lib/supabase/admin": "export const getAdminClient = () => globalThis.styleTestAdmin;",
      "@/server/db": "export const db = null;",
      "@/lib/supabase/server": 'export const createClient = () => { throw new Error("Unexpected auth client"); };',
    };
    if (specifier in stubs) return { url: moduleUrl(stubs[specifier]), shortCircuit: true };
    const candidate = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2))
      : specifier.startsWith(".") && context.parentURL?.startsWith("file:") ? fileURLToPath(new URL(specifier, context.parentURL)) : null;
    if (candidate && existsSync(`${candidate}.ts`)) return { url: pathToFileURL(`${candidate}.ts`).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
