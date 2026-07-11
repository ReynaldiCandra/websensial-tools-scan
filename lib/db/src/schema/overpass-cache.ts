import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";

export const overpassCacheTable = pgTable("overpass_cache", {
  id: serial("id").primaryKey(),
  // Hash unik dari kombinasi city + category + radius, dipakai sebagai cache key
  cacheKey: text("cache_key").notNull().unique(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OverpassCacheRow = typeof overpassCacheTable.$inferSelect;
