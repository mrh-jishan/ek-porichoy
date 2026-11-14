CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'citizen' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"phone_number" text,
	"phone_number_verified" boolean,
	"nid" text,
	"payer_org" text,
	"jurisdiction" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phoneNumber_unique" UNIQUE("phone_number"),
	CONSTRAINT "user_nid_unique" UNIQUE("nid")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"division_code" text NOT NULL,
	"district" text NOT NULL,
	"upazila" text NOT NULL,
	"union" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_type" text NOT NULL,
	"card_number" text NOT NULL,
	"holder_name" text NOT NULL,
	"claimed_nid" text,
	"matched_nid" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legacy_cards_cardNumber_unique" UNIQUE("card_number")
);
--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nid" text NOT NULL,
	"provider" text NOT NULL,
	"account_number" text NOT NULL,
	"kyc_verified" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"nid" text PRIMARY KEY NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"dob" date NOT NULL,
	"gender" text NOT NULL,
	"marital_status" text NOT NULL,
	"phone" text,
	"father_name_bn" text,
	"mother_name_bn" text,
	"blood_group" text,
	"birth_place" text,
	"household_id" uuid NOT NULL,
	"division_code" text NOT NULL,
	"occupation" text NOT NULL,
	"is_deceased" boolean DEFAULT false NOT NULL,
	"deceased_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_signals" (
	"nid" text PRIMARY KEY NOT NULL,
	"monthly_income" integer NOT NULL,
	"land_decimals" real DEFAULT 0 NOT NULL,
	"is_taxpayer" boolean DEFAULT false NOT NULL,
	"owns_vehicle" boolean DEFAULT false NOT NULL,
	"monthly_electricity_kwh" integer DEFAULT 0 NOT NULL,
	"is_govt_employee" boolean DEFAULT false NOT NULL,
	"has_disability" boolean DEFAULT false NOT NULL,
	"is_pregnant" boolean DEFAULT false NOT NULL,
	"sources" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nid" text NOT NULL,
	"program_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"poverty_score" real DEFAULT 0 NOT NULL,
	"source" text NOT NULL,
	"note" text,
	"enrolled_by" text,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollments_nid_programId_unique" UNIQUE("nid","program_id")
);
--> statement-breakpoint
CREATE TABLE "ministries" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	CONSTRAINT "ministries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_bn" text NOT NULL,
	"name_en" text NOT NULL,
	"description_bn" text NOT NULL,
	"description_en" text NOT NULL,
	"ministry_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"rules" jsonb NOT NULL,
	"poverty_targeted" boolean DEFAULT true NOT NULL,
	"annual_budget" bigint NOT NULL,
	"legacy_card_bn" text,
	"legacy_card_en" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programs_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "disbursement_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"period" text NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"total_amount" bigint DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"approved_by" text,
	"sent_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disbursement_batches_programId_period_provider_unique" UNIQUE("program_id","period","provider")
);
--> statement-breakpoint
CREATE TABLE "disbursements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"nid" text NOT NULL,
	"period" text NOT NULL,
	"amount" integer NOT NULL,
	"provider" text NOT NULL,
	"account_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"txn_ref" text,
	"failure_reason" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disbursements_batchId_enrollmentId_unique" UNIQUE("batch_id","enrollment_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"seq" bigserial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_role" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL,
	CONSTRAINT "audit_log_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "fraud_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"nid" text NOT NULL,
	"enrollment_id" uuid,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fraud_flags_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nid" text NOT NULL,
	"user_id" text,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_cards" ADD CONSTRAINT "legacy_cards_matched_nid_people_nid_fk" FOREIGN KEY ("matched_nid") REFERENCES "public"."people"("nid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_nid_people_nid_fk" FOREIGN KEY ("nid") REFERENCES "public"."people"("nid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_signals" ADD CONSTRAINT "person_signals_nid_people_nid_fk" FOREIGN KEY ("nid") REFERENCES "public"."people"("nid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_nid_people_nid_fk" FOREIGN KEY ("nid") REFERENCES "public"."people"("nid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_enrolled_by_user_id_fk" FOREIGN KEY ("enrolled_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_ministry_id_ministries_id_fk" FOREIGN KEY ("ministry_id") REFERENCES "public"."ministries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_batches" ADD CONSTRAINT "disbursement_batches_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_batches" ADD CONSTRAINT "disbursement_batches_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_batches" ADD CONSTRAINT "disbursement_batches_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_batch_id_disbursement_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."disbursement_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_index" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_index" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_index" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "households_division_code_upazila_index" ON "households" USING btree ("division_code","upazila");--> statement-breakpoint
CREATE INDEX "legacy_cards_status_index" ON "legacy_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "legacy_cards_card_type_index" ON "legacy_cards" USING btree ("card_type");--> statement-breakpoint
CREATE INDEX "payment_accounts_nid_index" ON "payment_accounts" USING btree ("nid");--> statement-breakpoint
CREATE INDEX "payment_accounts_account_number_index" ON "payment_accounts" USING btree ("account_number");--> statement-breakpoint
CREATE INDEX "people_household_id_index" ON "people" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "people_division_code_index" ON "people" USING btree ("division_code");--> statement-breakpoint
CREATE INDEX "people_phone_index" ON "people" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "enrollments_program_id_status_index" ON "enrollments" USING btree ("program_id","status");--> statement-breakpoint
CREATE INDEX "enrollments_status_index" ON "enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "disbursement_batches_provider_status_index" ON "disbursement_batches" USING btree ("provider","status");--> statement-breakpoint
CREATE INDEX "disbursements_nid_period_index" ON "disbursements" USING btree ("nid","period");--> statement-breakpoint
CREATE INDEX "disbursements_batch_id_status_index" ON "disbursements" USING btree ("batch_id","status");--> statement-breakpoint
CREATE INDEX "audit_log_entity_entity_id_index" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_index" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "fraud_flags_status_severity_index" ON "fraud_flags" USING btree ("status","severity");--> statement-breakpoint
CREATE INDEX "fraud_flags_nid_index" ON "fraud_flags" USING btree ("nid");--> statement-breakpoint
CREATE INDEX "grievances_status_index" ON "grievances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "grievances_nid_index" ON "grievances" USING btree ("nid");--> statement-breakpoint
CREATE INDEX "outbox_topic_delivered_at_index" ON "outbox" USING btree ("topic","delivered_at");