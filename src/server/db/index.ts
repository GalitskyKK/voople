import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Next.js открывает много параллельных запросов — Session pooler (:5432) лимит ~15.
 * Для Drizzle (мутации, chat) предпочитаем Transaction pooler (:6543) + один клиент.
 */
function pickConnectionString(): string | undefined {
  const direct = process.env.DIRECT_URL;
  const database = process.env.DATABASE_URL;
  const candidates = [database, direct].filter(Boolean) as string[];

  const transactionPooler = candidates.find(
    (u) => u.includes("pooler.supabase.com") && u.includes(":6543"),
  );
  if (transactionPooler) return transactionPooler;

  const sessionPooler = candidates.find(
    (u) => u.includes("pooler.supabase.com") && u.includes(":5432"),
  );
  if (sessionPooler) return sessionPooler;

  const anyPooler = candidates.find((u) => u.includes("pooler.supabase.com"));
  if (anyPooler) return anyPooler;

  return database ?? direct;
}

const connectionString = pickConnectionString();
const isTransactionPooler = connectionString?.includes(":6543");

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

function createClient() {
  if (!connectionString) return null;
  return postgres(connectionString, {
    prepare: isTransactionPooler ? false : undefined,
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    connect_timeout: 8,
  });
}

const client = globalForDb.pgClient ?? createClient();
if (client) globalForDb.pgClient = client;

export const db = client ? drizzle(client, { schema }) : null;

export type Database = NonNullable<typeof db>;
