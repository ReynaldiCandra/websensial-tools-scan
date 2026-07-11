import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  agencyName: text("agency_name").notNull().default("My Digital Agency"),
  contactEmail: text("contact_email").notNull().default("hello@agency.com"),
  whatsappNumber: text("whatsapp_number").notNull().default("081234567890"),
  defaultCurrency: text("default_currency").notNull().default("IDR"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const updateSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  updatedAt: true,
});
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
