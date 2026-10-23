ALTER TABLE "previews" ADD COLUMN "editor_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "previews" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
