import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { prospectsTable } from "./prospects";

export const previewsTable = pgTable("previews", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  prospectId: integer("prospect_id").notNull().references(() => prospectsTable.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name"),
  category: text("category").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  tagline: text("tagline"),
  colorScheme: text("color_scheme").notNull().default("indigo"),
  pageCategory: text("page_category").notNull().default("Umum"),
  templateStyle: text("template_style").notNull().default("classic"),
  services: text("services"),
  aboutText: text("about_text"),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Preview = typeof previewsTable.$inferSelect;
