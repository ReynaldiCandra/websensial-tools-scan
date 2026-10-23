import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { prospectsTable } from "./prospects";

export type PreviewCardStyle = "modern-minimal" | "elegant-classic" | "clean" | "image-focus" | "rounded" | "glass";

export interface PreviewEditorConfig {
  heroTitle?: string;
  heroDescription?: string;
  heroButtonLabel?: string;
  secondaryButtonLabel?: string;
  whatsappLabel?: string;
  footerText?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  sectionVisibility?: Record<string, boolean>;
  sectionStyles?: Record<string, PreviewCardStyle>;
  galleryItems?: Array<{ title: string; caption: string; imageUrl?: string }>;
}

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
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  galleryImageUrls: text("gallery_image_urls"),
  editorConfig: jsonb("editor_config").$type<PreviewEditorConfig>().notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Preview = typeof previewsTable.$inferSelect;
