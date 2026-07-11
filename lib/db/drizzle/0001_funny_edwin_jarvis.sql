CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"agency_name" text DEFAULT 'My Digital Agency' NOT NULL,
	"contact_email" text DEFAULT 'hello@agency.com' NOT NULL,
	"whatsapp_number" text DEFAULT '081234567890' NOT NULL,
	"default_currency" text DEFAULT 'IDR' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overpass_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "overpass_cache_cache_key_unique" UNIQUE("cache_key")
);
