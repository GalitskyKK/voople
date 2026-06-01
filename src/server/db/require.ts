import { db, type Database } from "./index";

export function requireDb(): Database {
  if (!db) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL (pooler) or DIRECT_URL in .env.local",
    );
  }
  return db;
}
