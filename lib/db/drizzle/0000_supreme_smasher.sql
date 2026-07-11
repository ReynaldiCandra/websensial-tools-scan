CREATE TABLE "prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"owner_name" text,
	"phone" text NOT NULL,
	"address" text,
	"category" text DEFAULT 'Umum' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"has_website" boolean DEFAULT false NOT NULL,
	"current_website" text,
	"status" text DEFAULT 'belum_dihubungi' NOT NULL,
	"notes" text,
	"rating" numeric(2, 1),
	"maps_url" text,
	"deal_value" numeric(15, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"type" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'initial' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"prospect_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"due_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(15, 2) NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "previews" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"prospect_id" integer NOT NULL,
	"business_name" text NOT NULL,
	"owner_name" text,
	"category" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"tagline" text,
	"color_scheme" text DEFAULT 'indigo' NOT NULL,
	"services" text,
	"about_text" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "previews_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previews" ADD CONSTRAINT "previews_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE cascade ON UPDATE no action;