ALTER TABLE "previews" ADD COLUMN "page_category" text;--> statement-breakpoint
UPDATE "previews" SET "page_category" = "category";--> statement-breakpoint
ALTER TABLE "previews" ALTER COLUMN "page_category" SET DEFAULT 'Umum';--> statement-breakpoint
ALTER TABLE "previews" ALTER COLUMN "page_category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "previews" ADD COLUMN "template_style" text DEFAULT 'classic' NOT NULL;