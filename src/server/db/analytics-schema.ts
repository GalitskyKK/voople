import { doublePrecision, index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/** Privacy-safe product, performance and client reliability events. */
export const clientTelemetryEvents = pgTable(
  "client_telemetry_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventKind: varchar("event_kind", { length: 16 }).notNull(),
    eventName: varchar("event_name", { length: 80 }).notNull(),
    platform: varchar("platform", { length: 16 }).notNull(),
    actorKey: varchar("actor_key", { length: 64 }),
    route: varchar("route", { length: 160 }).notNull(),
    release: varchar("release", { length: 40 }),
    properties: jsonb("properties").notNull().default({}),
    metricValue: doublePrecision("metric_value"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameTimeIdx: index("client_telemetry_event_name_time_idx").on(table.eventName, table.occurredAt),
    receivedIdx: index("client_telemetry_received_idx").on(table.receivedAt),
    actorTimeIdx: index("client_telemetry_actor_time_idx").on(table.actorKey, table.occurredAt),
  }),
);
