import { pgTable, text, serial, boolean, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const prospectsTable = pgTable("prospects", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name"),
  phone: text("phone").notNull(),
  address: text("address"),
  category: text("category").notNull().default("Umum"),
  source: text("source").notNull().default("manual"),
  hasWebsite: boolean("has_website").notNull().default(false),
  currentWebsite: text("current_website"),
  status: text("status").notNull().default("belum_dihubungi"),
  notes: text("notes"),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  mapsUrl: text("maps_url"),
  dealValue: numeric("deal_value", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProspectSchema = createInsertSchema(prospectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospectsTable.$inferSelect;
