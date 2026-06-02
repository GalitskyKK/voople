import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildShopCatalogSyncSql } from "../src/lib/shop/catalog-seed";

const generatedDir = resolve(process.cwd(), "drizzle", "generated");
const sql = buildShopCatalogSyncSql();

mkdirSync(generatedDir, { recursive: true });
const generatedFile = resolve(generatedDir, "shop-catalog-sync.sql");
const upsertFile = resolve(process.cwd(), "drizzle", "shop-catalog-upsert.sql");

writeFileSync(generatedFile, sql, "utf8");
writeFileSync(upsertFile, sql, "utf8");

process.stdout.write(`Wrote ${upsertFile}\n`);
