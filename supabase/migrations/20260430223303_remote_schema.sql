create extension if not exists "btree_gist" with schema "public";

create extension if not exists "citext" with schema "public";

create extension if not exists "pgtap" with schema "public";


  create table "public"."AvailabilityBlocks" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."AvailabilitySettings" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "admin_user_id" uuid,
    "work_start_time" time without time zone default '09:00:00'::time without time zone,
    "work_end_time" time without time zone default '17:00:00'::time without time zone,
    "timezone" text default 'UTC'::text,
    "updated_at" timestamp with time zone default now()
      );



  create table "public"."Contract" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid,
    "assigned_user_id" uuid not null,
    "session_id" uuid,
    "status" text default 'Draft'::text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "signed_pdf_url" text,
    "is_active" boolean default false
      );



  create table "public"."ContractTemplate" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(120),
    "body" text default 'When you sign this agreement, you agree to these essential terms: To book your date, you must pay a deposit (retainer) which is non-refundable. The rest of the payment is due 3 days before the photo session. If you cancel, you lose the deposit, and if you cancel within 1 day of the session, the full payment is still required. The Photographer owns the copyright to all photos, and you receive a license to use them for your own personal printing and sharing—you cannot sell the photos, change them (beyond cropping), or enter them in contests. You allow the Photographer to use the photos for their portfolio and promotion, unless you tell us in writing that you do not want us to. If the Photographer has an emergency and cannot perform the service, our responsibility is limited to giving you a full refund of all money you paid.'::text,
    "active" boolean,
    "session_type_id" uuid,
    "is_deleted" boolean default false
      );



  create table "public"."Gallery" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid,
    "title" character varying(120),
    "is_password_protected" boolean default false,
    "password_hash" text,
    "expires_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "published_email" text,
    "published_link" text,
    "cover_photo_path" text,
    "cover_photo_url" text,
    "personalized_message" text
      );



  create table "public"."Invoice" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid,
    "invoice_number" text,
    "issue_date" date,
    "due_date" date,
    "status" character varying(20) default 'Unpaid'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone,
    "items" jsonb,
    "remaining" numeric default '0'::numeric
      );



  create table "public"."Notification" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "session_id" uuid,
    "channel" character varying(10),
    "subject" character varying(160),
    "body" text,
    "status" character varying(20),
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."Payment" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_id" uuid,
    "provider" character varying(20),
    "provider_payment_id" text,
    "amount" numeric(10,2),
    "currency" character varying(3) default 'USD'::character varying,
    "status" character varying(20),
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "type" text
      );



  create table "public"."QuestionnaireAnswer" (
    "questionnaire_id" uuid not null,
    "answer" text,
    "question_id" uuid not null,
    "question" jsonb not null default '{}'::jsonb
      );



  create table "public"."QuestionnaireResponse" (
    "id" uuid not null default gen_random_uuid(),
    "session_id" uuid,
    "template_id" uuid,
    "status" character varying(20),
    "submitted_at" timestamp with time zone,
    "created_at" timestamp with time zone
      );



  create table "public"."QuestionnaireTemplate" (
    "id" uuid not null default gen_random_uuid(),
    "session_type_id" uuid,
    "name" character varying(120),
    "schema_json" jsonb,
    "active" boolean
      );



  create table "public"."Questions" (
    "id" uuid not null default gen_random_uuid(),
    "questionnaire_id" uuid not null,
    "label" text not null,
    "type" text not null,
    "required" boolean not null default false,
    "order_index" integer not null default 0,
    "options" jsonb
      );



  create table "public"."Role" (
    "id" uuid not null,
    "name" character varying(50),
    "description" text
      );



  create table "public"."Session" (
    "id" uuid not null default gen_random_uuid(),
    "client_id" uuid,
    "session_type_id" uuid,
    "start_at" timestamp with time zone,
    "end_at" timestamp with time zone,
    "location_text" character varying(255),
    "status" character varying(20),
    "notes" text,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "is_active" boolean default false
      );



  create table "public"."SessionType" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(80),
    "description" text,
    "default_duration_minutes" integer,
    "base_price" numeric(10,2),
    "active" boolean,
    "image_path" text,
    "bullet_points" text[],
    "display_order" integer default 0,
    "price_label" character varying(80),
    "category" text not null default 'General'::text,
    "is_master" boolean default false
      );



  create table "public"."User" (
    "id" uuid not null,
    "email" public.citext not null,
    "first_name" character varying(80),
    "last_name" character varying(80),
    "phone" character varying(32),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "last_login_at" timestamp with time zone
      );



  create table "public"."UserRole" (
    "user_id" uuid not null,
    "role_id" uuid not null,
    "assigned_at" timestamp with time zone default now()
      );



  create table "public"."user_email_log" (
    "id" uuid not null default gen_random_uuid(),
    "email_type" character varying(50) not null,
    "email_address" character varying(255) not null,
    "status" character varying(20) not null default 'pending'::character varying,
    "error_message" text,
    "sent_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_email_log" enable row level security;

CREATE UNIQUE INDEX "AvailabilityBlocks_pkey" ON public."AvailabilityBlocks" USING btree (id);

CREATE UNIQUE INDEX "AvailabilitySettings_pkey" ON public."AvailabilitySettings" USING btree (id);

CREATE UNIQUE INDEX "ContractTemplate_pkey" ON public."ContractTemplate" USING btree (id);

CREATE UNIQUE INDEX "Contract_pkey" ON public."Contract" USING btree (id);

CREATE UNIQUE INDEX "Contract_session_id_key" ON public."Contract" USING btree (session_id);

CREATE UNIQUE INDEX "Gallery_pkey" ON public."Gallery" USING btree (id);

CREATE UNIQUE INDEX "Gallery_session_id_key" ON public."Gallery" USING btree (session_id);

CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON public."Invoice" USING btree (invoice_number);

CREATE UNIQUE INDEX "Invoice_pkey" ON public."Invoice" USING btree (id);

CREATE UNIQUE INDEX "Invoice_session_id_key" ON public."Invoice" USING btree (session_id);

CREATE UNIQUE INDEX "Notification_pkey" ON public."Notification" USING btree (id);

CREATE UNIQUE INDEX "Payment_pkey" ON public."Payment" USING btree (id);

CREATE UNIQUE INDEX "Payment_provider_payment_id_key" ON public."Payment" USING btree (provider_payment_id);

CREATE UNIQUE INDEX "QuestionnaireAnswer_pkey" ON public."QuestionnaireAnswer" USING btree (questionnaire_id, question_id);

CREATE UNIQUE INDEX "QuestionnaireTemplate_pkey" ON public."QuestionnaireTemplate" USING btree (id);

CREATE UNIQUE INDEX "Questionnaire_pkey" ON public."QuestionnaireResponse" USING btree (id);

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);

CREATE UNIQUE INDEX "Role_pkey" ON public."Role" USING btree (id);

CREATE UNIQUE INDEX "SessionType_pkey" ON public."SessionType" USING btree (id);

CREATE UNIQUE INDEX "Session_pkey" ON public."Session" USING btree (id);

CREATE UNIQUE INDEX "UserRole_pkey" ON public."UserRole" USING btree (user_id);

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);

CREATE UNIQUE INDEX "User_pkey" ON public."User" USING btree (id);

CREATE INDEX idx_session_client_start ON public."Session" USING btree (client_id, start_at);

CREATE INDEX idx_user_email_log_email_type ON public.user_email_log USING btree (email_type);

CREATE INDEX idx_user_email_log_status ON public.user_email_log USING btree (status);

CREATE UNIQUE INDEX questions_pkey ON public."Questions" USING btree (id);

select 1; 
-- CREATE INDEX session_no_overlap ON public."Session" USING gist (client_id, tstzrange(start_at, end_at, '[)'::text)) WHERE ((COALESCE(status, 'booked'::character varying))::text <> 'canceled'::text);

CREATE UNIQUE INDEX user_email_log_pkey ON public.user_email_log USING btree (id);

alter table "public"."AvailabilityBlocks" add constraint "AvailabilityBlocks_pkey" PRIMARY KEY using index "AvailabilityBlocks_pkey";

alter table "public"."AvailabilitySettings" add constraint "AvailabilitySettings_pkey" PRIMARY KEY using index "AvailabilitySettings_pkey";

alter table "public"."Contract" add constraint "Contract_pkey" PRIMARY KEY using index "Contract_pkey";

alter table "public"."ContractTemplate" add constraint "ContractTemplate_pkey" PRIMARY KEY using index "ContractTemplate_pkey";

alter table "public"."Gallery" add constraint "Gallery_pkey" PRIMARY KEY using index "Gallery_pkey";

alter table "public"."Invoice" add constraint "Invoice_pkey" PRIMARY KEY using index "Invoice_pkey";

alter table "public"."Notification" add constraint "Notification_pkey" PRIMARY KEY using index "Notification_pkey";

alter table "public"."Payment" add constraint "Payment_pkey" PRIMARY KEY using index "Payment_pkey";

alter table "public"."QuestionnaireAnswer" add constraint "QuestionnaireAnswer_pkey" PRIMARY KEY using index "QuestionnaireAnswer_pkey";

alter table "public"."QuestionnaireResponse" add constraint "Questionnaire_pkey" PRIMARY KEY using index "Questionnaire_pkey";

alter table "public"."QuestionnaireTemplate" add constraint "QuestionnaireTemplate_pkey" PRIMARY KEY using index "QuestionnaireTemplate_pkey";

alter table "public"."Questions" add constraint "questions_pkey" PRIMARY KEY using index "questions_pkey";

alter table "public"."Role" add constraint "Role_pkey" PRIMARY KEY using index "Role_pkey";

alter table "public"."Session" add constraint "Session_pkey" PRIMARY KEY using index "Session_pkey";

alter table "public"."SessionType" add constraint "SessionType_pkey" PRIMARY KEY using index "SessionType_pkey";

alter table "public"."User" add constraint "User_pkey" PRIMARY KEY using index "User_pkey";

alter table "public"."UserRole" add constraint "UserRole_pkey" PRIMARY KEY using index "UserRole_pkey";

alter table "public"."user_email_log" add constraint "user_email_log_pkey" PRIMARY KEY using index "user_email_log_pkey";

alter table "public"."AvailabilitySettings" add constraint "AvailabilitySettings_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES public."User"(id) not valid;

alter table "public"."AvailabilitySettings" validate constraint "AvailabilitySettings_admin_user_id_fkey";

alter table "public"."Contract" add constraint "Contract_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."Contract" validate constraint "Contract_assigned_user_id_fkey";

alter table "public"."Contract" add constraint "Contract_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Contract" validate constraint "Contract_session_id_fkey";

alter table "public"."Contract" add constraint "Contract_session_id_key" UNIQUE using index "Contract_session_id_key";

alter table "public"."Contract" add constraint "Contract_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."ContractTemplate"(id) ON DELETE CASCADE not valid;

alter table "public"."Contract" validate constraint "Contract_template_id_fkey";

alter table "public"."ContractTemplate" add constraint "ContractTemplate_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) not valid;

alter table "public"."ContractTemplate" validate constraint "ContractTemplate_session_type_id_fkey";

alter table "public"."Gallery" add constraint "Gallery_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Gallery" validate constraint "Gallery_session_id_fkey";

alter table "public"."Gallery" add constraint "Gallery_session_id_key" UNIQUE using index "Gallery_session_id_key";

alter table "public"."Invoice" add constraint "Invoice_invoice_number_key" UNIQUE using index "Invoice_invoice_number_key";

alter table "public"."Invoice" add constraint "Invoice_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Invoice" validate constraint "Invoice_session_id_fkey";

alter table "public"."Invoice" add constraint "Invoice_session_id_key" UNIQUE using index "Invoice_session_id_key";

alter table "public"."Notification" add constraint "Notification_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Notification" validate constraint "Notification_session_id_fkey";

alter table "public"."Notification" add constraint "Notification_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."Notification" validate constraint "Notification_user_id_fkey";

alter table "public"."Payment" add constraint "Payment_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public."Invoice"(id) ON DELETE CASCADE not valid;

alter table "public"."Payment" validate constraint "Payment_invoice_id_fkey";

alter table "public"."Payment" add constraint "Payment_provider_payment_id_key" UNIQUE using index "Payment_provider_payment_id_key";

alter table "public"."QuestionnaireAnswer" add constraint "QuestionnaireAnswer_questionnaire_id_fkey" FOREIGN KEY (questionnaire_id) REFERENCES public."QuestionnaireResponse"(id) ON DELETE CASCADE not valid;

alter table "public"."QuestionnaireAnswer" validate constraint "QuestionnaireAnswer_questionnaire_id_fkey";

alter table "public"."QuestionnaireResponse" add constraint "Questionnaire_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."QuestionnaireTemplate"(id) ON DELETE SET NULL not valid;

alter table "public"."QuestionnaireResponse" validate constraint "Questionnaire_template_id_fkey";

alter table "public"."QuestionnaireResponse" add constraint "questionnaire_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."QuestionnaireResponse" validate constraint "questionnaire_session_id_fkey";

alter table "public"."QuestionnaireTemplate" add constraint "QuestionnaireTemplate_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) ON DELETE SET NULL not valid;

alter table "public"."QuestionnaireTemplate" validate constraint "QuestionnaireTemplate_session_type_id_fkey";

alter table "public"."Questions" add constraint "questions_questionnaire_id_fkey" FOREIGN KEY (questionnaire_id) REFERENCES public."QuestionnaireTemplate"(id) ON DELETE CASCADE not valid;

alter table "public"."Questions" validate constraint "questions_questionnaire_id_fkey";

alter table "public"."Role" add constraint "Role_name_key" UNIQUE using index "Role_name_key";

alter table "public"."Session" add constraint "Session_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."Session" validate constraint "Session_client_id_fkey";

alter table "public"."Session" add constraint "Session_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) ON DELETE SET NULL not valid;

alter table "public"."Session" validate constraint "Session_session_type_id_fkey";

alter table "public"."Session" add constraint "session_no_overlap" EXCLUDE USING gist (client_id WITH =, tstzrange(start_at, end_at, '[)'::text) WITH &&) WHERE (((COALESCE(status, 'booked'::character varying))::text <> 'canceled'::text));

alter table "public"."User" add constraint "User_email_key" UNIQUE using index "User_email_key";

alter table "public"."UserRole" add constraint "UserRole_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) not valid;

alter table "public"."UserRole" validate constraint "UserRole_role_id_fkey";

alter table "public"."UserRole" add constraint "UserRole_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."UserRole" validate constraint "UserRole_user_id_fkey";

set check_function_bodies = off;

create type "public"."_time_trial_type" as ("a_time" numeric);

CREATE OR REPLACE FUNCTION public.delete_signed_contract_from_storage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  project_url text := 'https://zccwrooyhkpkslgqdkvq.supabase.co';
  service_role_key  text;
  bucket_name text := 'Signed-contracts'; 
  object_path text;
  response_status int;
BEGIN
  -- only proceed to delete if there was an actual signed contract
  If OLD.signed_pdf_url IS NULL or OLD.signed_pdf_url = '' THEN
    RETURN OLD;
  END IF;
  -- get service role key from vault
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF service_role_key is NULL THEN 
   RAISE WARNING 'service_role_key not found in vault; skipping deletion from storage for contract %', OLD.id;
   RETURN OLD;
   END IF;
  
  -- extract object path 
  object_path := OLD.signed_pdf_url;
  
  -- strip th supabase URL 
  object_path := regexp_replace(
    object_path,
    '^.*/storage/v1/object/public/' || bucket_name || '/',
    ''
  );
  object_path := split_part(object_path, '?', 1);

  IF object_path LIKE bucket_name || '/%' THEN
    object_path := substring(object_path FROM length(bucket_name) +2);
  END IF;

  IF object_path IS NULL or object_path = '' OR object_path = OLD.signed_pdf_url THEN
    RAISE WARNING  ' Could not parse object path from signed_pdf_url: %', OLD.signed_pdf_url;
    RETURN OLD;
  END IF;

  -- call supabase storage rest api to delete the signed contract
  PERFORM net.http_delete (
    url := project_url || 'storage/v1/object/public/' || bucket_name || '/' || object_path,
    headers := jsonb_build_object (
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    )
  );

  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_client_and_admin_booking_received()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_email      text;
  client_name       text;
  client_phone      text;
  admin_email       text;
  session_type_name text;
  project_url       text := 'https://zccwrooyhkpkslgqdkvq.supabase.co';
  service_role_key  text;
BEGIN
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

    -- Get client info
    SELECT
      u.email::text,
      u.first_name || ' ' || COALESCE(u.last_name, ''),
      u.phone
    INTO client_email, client_name, client_phone
    FROM "User" u
    WHERE u.id = NEW.client_id;

    -- Get session type name if exists
    SELECT name INTO session_type_name
    FROM "SessionType"
    WHERE id = NEW.session_type_id;

    -- Get admin email
    SELECT u.email::text INTO admin_email
    FROM "User" u
    JOIN "UserRole" ur ON ur.user_id = u.id
    JOIN "Role" r ON r.id = ur.role_id
    WHERE r.name = 'Admin'
    LIMIT 1;

    -- 1) Notify client
    PERFORM net.http_post(
      url     := project_url || '/functions/v1/send-booking-request-confirmation-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'email', client_email,
        'name', TRIM(client_name),
        'startAt', New.start_at,
        'endAt',  NEW.end_at,
        'location', NEW.location_text,
        'sessionType', COALESCE(session_type_name, 'To Be Determined'),
        'status', 'Pending',
        'notes', COALESCE(NEW.notes, '')
      )
    );

    -- 2) Notify admin
    PERFORM net.http_post(
      url     := project_url || '/functions/v1/send-admin-new-booking-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'adminEmail',   admin_email,
        'clientName',   TRIM(client_name),
        'clientEmail',  client_email,
        'clientPhone',  COALESCE(client_phone, 'Not provided'),
        'startAt', New.start_at,
        'endAt',  NEW.end_at,
        'location',     NEW.location_text,
        'sessionType',  COALESCE(session_type_name, 'Unknown Session Type'),
        'notes',    COALESCE(NEW.notes, '')
      )
    );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_client_booking_received()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_email      text;
  client_name       text;
  client_phone      text;
  admin_email       text;
  session_type_name text;
  project_url       text := 'https://zccwrooyhkpkslgqdkvq.supabase.co';
  service_role_key  text;
BEGIN
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF NEW.status = 'pending' THEN
    -- Get client info
    SELECT
      u.email::text,
      u.first_name || ' ' || COALESCE(u.last_name, ''),
      u.phone
    INTO client_email, client_name, client_phone
    FROM "User" u
    WHERE u.id = NEW.client_id;

    -- Get session type name if exists
    SELECT name INTO session_type_name
    FROM "SessionType"
    WHERE id = NEW.session_type_id;

    -- Get admin email
    SELECT u.email::text INTO admin_email
    FROM "User" u
    JOIN "UserRole" ur ON ur.user_id = u.id
    JOIN "Role" r ON r.id = ur.role_id
    WHERE r.name = 'Admin'
    LIMIT 1;

    -- 1) Notify client
    PERFORM net.http_post(
      url     := project_url || '/functions/v1/send-booking-confirmation-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'email',        client_email,
        'name',         TRIM(client_name),
        'sessionDate',  TO_CHAR(NEW.start_at, 'FMMonth DD, YYYY'),
        'sessionTime',  TO_CHAR(NEW.start_at, 'HH12:MI AM') || ' – ' || TO_CHAR(NEW.end_at, 'HH12:MI AM'),
        'location',     NEW.location_text,
        'sessionType',  COALESCE(session_type_name, 'To Be Determined'),
        'status',       'Pending Admin Approval'
      )
    );

    -- 2) Notify admin
    PERFORM net.http_post(
      url     := project_url || '/functions/v1/send-admin-new-booking-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'adminEmail',   admin_email,
        'clientName',   TRIM(client_name),
        'clientEmail',  client_email,
        'clientPhone',  COALESCE(client_phone, 'Not provided'),
        'sessionDate',  TO_CHAR(NEW.start_at, 'FMMonth DD, YYYY'),
        'sessionTime',  TO_CHAR(NEW.start_at, 'HH12:MI AM') || ' – ' || TO_CHAR(NEW.end_at, 'HH12:MI AM'),
        'location',     NEW.location_text,
        'sessionType',  COALESCE(session_type_name, 'To Be Determined'),
        'sessionId',    NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_client_gallery_ready()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_email text;
  client_name text;
  session_date timestamptz;
  project_url text := 'https://zccwrooyhkpkslgqdkvq.supabase.co';
  service_role_key text;
BEGIN
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF NEW.published_link IS NOT NULL AND OLD.published_link IS NULL THEN
    SELECT
      u.email::text,
      u.first_name || ' ' || COALESCE(u.last_name, ''),
      s.start_at
    INTO client_email, client_name, session_date
    FROM "Session" s
    JOIN "User" u ON u.id = s.client_id
    WHERE s.id = NEW.session_id;

    PERFORM net.http_post(
      url     := project_url || '/functions/v1/send-gallery-upload-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'email', client_email,
        'name', TRIM(client_name),
        'URL', NEW.published_link,
        'startAt', session_date,
        'coverPhotoUrl', NEW.cover_photo_url,
        'personalizedMessage', NEW.personalized_message
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_client_session_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_email      text;
  client_name       text;
  session_type_name text;
  project_url       text := 'https://zccwrooyhkpkslgqdkvq.supabase.co';
  service_role_key  text;
BEGIN
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  -- Only fire when status transitions to 'confirmed'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Confirmed' THEN

    -- Get client info
    SELECT
      u.email::text,
      u.first_name || ' ' || COALESCE(u.last_name, '')
    INTO client_email, client_name
    FROM "User" u
    WHERE u.id = NEW.client_id;

    -- Get session type name
    SELECT name INTO session_type_name
    FROM "SessionType"
    WHERE id = NEW.session_type_id;

    -- Notify client with confirmed session details
    -- Old time/location values are passed so the edge function can highlight what changed
    PERFORM net.http_post(
      url     := project_url || '/functions/v1/send-confirmed-session-details-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'email', client_email,
        'name', TRIM(client_name),
        'sessionType', COALESCE(session_type_name, 'To Be Determined'),
        'startAt', NEW.start_at,
        'endAt', NEW.end_at,
        'oldStartAt', OLD.start_at,
        'oldEndAt', OLD.end_at,
        'newLocation',    NEW.location_text,
        'oldLocation',    OLD.location_text,
        'notes',    COALESCE(NEW.notes, ''),
        'URL', 'https://www.yourrootsphotography.space'
      )
    );

  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_contacts_from_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public."Contact" (id, first_name, last_name, email, phone)
    VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.email, NEW.phone)
    ON CONFLICT (id) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name  = EXCLUDED.last_name,
          email      = EXCLUDED.email,
          phone      = EXCLUDED.phone;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    UPDATE public."Contact"
    SET first_name = NEW.first_name,
        last_name  = NEW.last_name,
        email      = NEW.email,
        phone      = NEW.phone
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public."Contact"
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;


  RETURN NEW;
END;
$function$
;

grant delete on table "public"."AvailabilityBlocks" to "anon";

grant insert on table "public"."AvailabilityBlocks" to "anon";

grant references on table "public"."AvailabilityBlocks" to "anon";

grant select on table "public"."AvailabilityBlocks" to "anon";

grant trigger on table "public"."AvailabilityBlocks" to "anon";

grant truncate on table "public"."AvailabilityBlocks" to "anon";

grant update on table "public"."AvailabilityBlocks" to "anon";

grant delete on table "public"."AvailabilityBlocks" to "authenticated";

grant insert on table "public"."AvailabilityBlocks" to "authenticated";

grant references on table "public"."AvailabilityBlocks" to "authenticated";

grant select on table "public"."AvailabilityBlocks" to "authenticated";

grant trigger on table "public"."AvailabilityBlocks" to "authenticated";

grant truncate on table "public"."AvailabilityBlocks" to "authenticated";

grant update on table "public"."AvailabilityBlocks" to "authenticated";

grant delete on table "public"."AvailabilityBlocks" to "service_role";

grant insert on table "public"."AvailabilityBlocks" to "service_role";

grant references on table "public"."AvailabilityBlocks" to "service_role";

grant select on table "public"."AvailabilityBlocks" to "service_role";

grant trigger on table "public"."AvailabilityBlocks" to "service_role";

grant truncate on table "public"."AvailabilityBlocks" to "service_role";

grant update on table "public"."AvailabilityBlocks" to "service_role";

grant delete on table "public"."AvailabilitySettings" to "anon";

grant insert on table "public"."AvailabilitySettings" to "anon";

grant references on table "public"."AvailabilitySettings" to "anon";

grant select on table "public"."AvailabilitySettings" to "anon";

grant trigger on table "public"."AvailabilitySettings" to "anon";

grant truncate on table "public"."AvailabilitySettings" to "anon";

grant update on table "public"."AvailabilitySettings" to "anon";

grant delete on table "public"."AvailabilitySettings" to "authenticated";

grant insert on table "public"."AvailabilitySettings" to "authenticated";

grant references on table "public"."AvailabilitySettings" to "authenticated";

grant select on table "public"."AvailabilitySettings" to "authenticated";

grant trigger on table "public"."AvailabilitySettings" to "authenticated";

grant truncate on table "public"."AvailabilitySettings" to "authenticated";

grant update on table "public"."AvailabilitySettings" to "authenticated";

grant delete on table "public"."AvailabilitySettings" to "service_role";

grant insert on table "public"."AvailabilitySettings" to "service_role";

grant references on table "public"."AvailabilitySettings" to "service_role";

grant select on table "public"."AvailabilitySettings" to "service_role";

grant trigger on table "public"."AvailabilitySettings" to "service_role";

grant truncate on table "public"."AvailabilitySettings" to "service_role";

grant update on table "public"."AvailabilitySettings" to "service_role";

grant delete on table "public"."Contract" to "anon";

grant insert on table "public"."Contract" to "anon";

grant references on table "public"."Contract" to "anon";

grant select on table "public"."Contract" to "anon";

grant trigger on table "public"."Contract" to "anon";

grant truncate on table "public"."Contract" to "anon";

grant update on table "public"."Contract" to "anon";

grant delete on table "public"."Contract" to "authenticated";

grant insert on table "public"."Contract" to "authenticated";

grant references on table "public"."Contract" to "authenticated";

grant select on table "public"."Contract" to "authenticated";

grant trigger on table "public"."Contract" to "authenticated";

grant truncate on table "public"."Contract" to "authenticated";

grant update on table "public"."Contract" to "authenticated";

grant delete on table "public"."Contract" to "service_role";

grant insert on table "public"."Contract" to "service_role";

grant references on table "public"."Contract" to "service_role";

grant select on table "public"."Contract" to "service_role";

grant trigger on table "public"."Contract" to "service_role";

grant truncate on table "public"."Contract" to "service_role";

grant update on table "public"."Contract" to "service_role";

grant delete on table "public"."ContractTemplate" to "anon";

grant insert on table "public"."ContractTemplate" to "anon";

grant references on table "public"."ContractTemplate" to "anon";

grant select on table "public"."ContractTemplate" to "anon";

grant trigger on table "public"."ContractTemplate" to "anon";

grant truncate on table "public"."ContractTemplate" to "anon";

grant update on table "public"."ContractTemplate" to "anon";

grant delete on table "public"."ContractTemplate" to "authenticated";

grant insert on table "public"."ContractTemplate" to "authenticated";

grant references on table "public"."ContractTemplate" to "authenticated";

grant select on table "public"."ContractTemplate" to "authenticated";

grant trigger on table "public"."ContractTemplate" to "authenticated";

grant truncate on table "public"."ContractTemplate" to "authenticated";

grant update on table "public"."ContractTemplate" to "authenticated";

grant delete on table "public"."ContractTemplate" to "service_role";

grant insert on table "public"."ContractTemplate" to "service_role";

grant references on table "public"."ContractTemplate" to "service_role";

grant select on table "public"."ContractTemplate" to "service_role";

grant trigger on table "public"."ContractTemplate" to "service_role";

grant truncate on table "public"."ContractTemplate" to "service_role";

grant update on table "public"."ContractTemplate" to "service_role";

grant delete on table "public"."Gallery" to "anon";

grant insert on table "public"."Gallery" to "anon";

grant references on table "public"."Gallery" to "anon";

grant select on table "public"."Gallery" to "anon";

grant trigger on table "public"."Gallery" to "anon";

grant truncate on table "public"."Gallery" to "anon";

grant update on table "public"."Gallery" to "anon";

grant delete on table "public"."Gallery" to "authenticated";

grant insert on table "public"."Gallery" to "authenticated";

grant references on table "public"."Gallery" to "authenticated";

grant select on table "public"."Gallery" to "authenticated";

grant trigger on table "public"."Gallery" to "authenticated";

grant truncate on table "public"."Gallery" to "authenticated";

grant update on table "public"."Gallery" to "authenticated";

grant delete on table "public"."Gallery" to "service_role";

grant insert on table "public"."Gallery" to "service_role";

grant references on table "public"."Gallery" to "service_role";

grant select on table "public"."Gallery" to "service_role";

grant trigger on table "public"."Gallery" to "service_role";

grant truncate on table "public"."Gallery" to "service_role";

grant update on table "public"."Gallery" to "service_role";

grant delete on table "public"."Invoice" to "anon";

grant insert on table "public"."Invoice" to "anon";

grant references on table "public"."Invoice" to "anon";

grant select on table "public"."Invoice" to "anon";

grant trigger on table "public"."Invoice" to "anon";

grant truncate on table "public"."Invoice" to "anon";

grant update on table "public"."Invoice" to "anon";

grant delete on table "public"."Invoice" to "authenticated";

grant insert on table "public"."Invoice" to "authenticated";

grant references on table "public"."Invoice" to "authenticated";

grant select on table "public"."Invoice" to "authenticated";

grant trigger on table "public"."Invoice" to "authenticated";

grant truncate on table "public"."Invoice" to "authenticated";

grant update on table "public"."Invoice" to "authenticated";

grant delete on table "public"."Invoice" to "service_role";

grant insert on table "public"."Invoice" to "service_role";

grant references on table "public"."Invoice" to "service_role";

grant select on table "public"."Invoice" to "service_role";

grant trigger on table "public"."Invoice" to "service_role";

grant truncate on table "public"."Invoice" to "service_role";

grant update on table "public"."Invoice" to "service_role";

grant delete on table "public"."Notification" to "anon";

grant insert on table "public"."Notification" to "anon";

grant references on table "public"."Notification" to "anon";

grant select on table "public"."Notification" to "anon";

grant trigger on table "public"."Notification" to "anon";

grant truncate on table "public"."Notification" to "anon";

grant update on table "public"."Notification" to "anon";

grant delete on table "public"."Notification" to "authenticated";

grant insert on table "public"."Notification" to "authenticated";

grant references on table "public"."Notification" to "authenticated";

grant select on table "public"."Notification" to "authenticated";

grant trigger on table "public"."Notification" to "authenticated";

grant truncate on table "public"."Notification" to "authenticated";

grant update on table "public"."Notification" to "authenticated";

grant delete on table "public"."Notification" to "service_role";

grant insert on table "public"."Notification" to "service_role";

grant references on table "public"."Notification" to "service_role";

grant select on table "public"."Notification" to "service_role";

grant trigger on table "public"."Notification" to "service_role";

grant truncate on table "public"."Notification" to "service_role";

grant update on table "public"."Notification" to "service_role";

grant delete on table "public"."Payment" to "anon";

grant insert on table "public"."Payment" to "anon";

grant references on table "public"."Payment" to "anon";

grant select on table "public"."Payment" to "anon";

grant trigger on table "public"."Payment" to "anon";

grant truncate on table "public"."Payment" to "anon";

grant update on table "public"."Payment" to "anon";

grant delete on table "public"."Payment" to "authenticated";

grant insert on table "public"."Payment" to "authenticated";

grant references on table "public"."Payment" to "authenticated";

grant select on table "public"."Payment" to "authenticated";

grant trigger on table "public"."Payment" to "authenticated";

grant truncate on table "public"."Payment" to "authenticated";

grant update on table "public"."Payment" to "authenticated";

grant delete on table "public"."Payment" to "service_role";

grant insert on table "public"."Payment" to "service_role";

grant references on table "public"."Payment" to "service_role";

grant select on table "public"."Payment" to "service_role";

grant trigger on table "public"."Payment" to "service_role";

grant truncate on table "public"."Payment" to "service_role";

grant update on table "public"."Payment" to "service_role";

grant delete on table "public"."QuestionnaireAnswer" to "anon";

grant insert on table "public"."QuestionnaireAnswer" to "anon";

grant references on table "public"."QuestionnaireAnswer" to "anon";

grant select on table "public"."QuestionnaireAnswer" to "anon";

grant trigger on table "public"."QuestionnaireAnswer" to "anon";

grant truncate on table "public"."QuestionnaireAnswer" to "anon";

grant update on table "public"."QuestionnaireAnswer" to "anon";

grant delete on table "public"."QuestionnaireAnswer" to "authenticated";

grant insert on table "public"."QuestionnaireAnswer" to "authenticated";

grant references on table "public"."QuestionnaireAnswer" to "authenticated";

grant select on table "public"."QuestionnaireAnswer" to "authenticated";

grant trigger on table "public"."QuestionnaireAnswer" to "authenticated";

grant truncate on table "public"."QuestionnaireAnswer" to "authenticated";

grant update on table "public"."QuestionnaireAnswer" to "authenticated";

grant delete on table "public"."QuestionnaireAnswer" to "service_role";

grant insert on table "public"."QuestionnaireAnswer" to "service_role";

grant references on table "public"."QuestionnaireAnswer" to "service_role";

grant select on table "public"."QuestionnaireAnswer" to "service_role";

grant trigger on table "public"."QuestionnaireAnswer" to "service_role";

grant truncate on table "public"."QuestionnaireAnswer" to "service_role";

grant update on table "public"."QuestionnaireAnswer" to "service_role";

grant delete on table "public"."QuestionnaireResponse" to "anon";

grant insert on table "public"."QuestionnaireResponse" to "anon";

grant references on table "public"."QuestionnaireResponse" to "anon";

grant select on table "public"."QuestionnaireResponse" to "anon";

grant trigger on table "public"."QuestionnaireResponse" to "anon";

grant truncate on table "public"."QuestionnaireResponse" to "anon";

grant update on table "public"."QuestionnaireResponse" to "anon";

grant delete on table "public"."QuestionnaireResponse" to "authenticated";

grant insert on table "public"."QuestionnaireResponse" to "authenticated";

grant references on table "public"."QuestionnaireResponse" to "authenticated";

grant select on table "public"."QuestionnaireResponse" to "authenticated";

grant trigger on table "public"."QuestionnaireResponse" to "authenticated";

grant truncate on table "public"."QuestionnaireResponse" to "authenticated";

grant update on table "public"."QuestionnaireResponse" to "authenticated";

grant delete on table "public"."QuestionnaireResponse" to "service_role";

grant insert on table "public"."QuestionnaireResponse" to "service_role";

grant references on table "public"."QuestionnaireResponse" to "service_role";

grant select on table "public"."QuestionnaireResponse" to "service_role";

grant trigger on table "public"."QuestionnaireResponse" to "service_role";

grant truncate on table "public"."QuestionnaireResponse" to "service_role";

grant update on table "public"."QuestionnaireResponse" to "service_role";

grant delete on table "public"."QuestionnaireTemplate" to "anon";

grant insert on table "public"."QuestionnaireTemplate" to "anon";

grant references on table "public"."QuestionnaireTemplate" to "anon";

grant select on table "public"."QuestionnaireTemplate" to "anon";

grant trigger on table "public"."QuestionnaireTemplate" to "anon";

grant truncate on table "public"."QuestionnaireTemplate" to "anon";

grant update on table "public"."QuestionnaireTemplate" to "anon";

grant delete on table "public"."QuestionnaireTemplate" to "authenticated";

grant insert on table "public"."QuestionnaireTemplate" to "authenticated";

grant references on table "public"."QuestionnaireTemplate" to "authenticated";

grant select on table "public"."QuestionnaireTemplate" to "authenticated";

grant trigger on table "public"."QuestionnaireTemplate" to "authenticated";

grant truncate on table "public"."QuestionnaireTemplate" to "authenticated";

grant update on table "public"."QuestionnaireTemplate" to "authenticated";

grant delete on table "public"."QuestionnaireTemplate" to "service_role";

grant insert on table "public"."QuestionnaireTemplate" to "service_role";

grant references on table "public"."QuestionnaireTemplate" to "service_role";

grant select on table "public"."QuestionnaireTemplate" to "service_role";

grant trigger on table "public"."QuestionnaireTemplate" to "service_role";

grant truncate on table "public"."QuestionnaireTemplate" to "service_role";

grant update on table "public"."QuestionnaireTemplate" to "service_role";

grant delete on table "public"."Questions" to "anon";

grant insert on table "public"."Questions" to "anon";

grant references on table "public"."Questions" to "anon";

grant select on table "public"."Questions" to "anon";

grant trigger on table "public"."Questions" to "anon";

grant truncate on table "public"."Questions" to "anon";

grant update on table "public"."Questions" to "anon";

grant delete on table "public"."Questions" to "authenticated";

grant insert on table "public"."Questions" to "authenticated";

grant references on table "public"."Questions" to "authenticated";

grant select on table "public"."Questions" to "authenticated";

grant trigger on table "public"."Questions" to "authenticated";

grant truncate on table "public"."Questions" to "authenticated";

grant update on table "public"."Questions" to "authenticated";

grant delete on table "public"."Questions" to "service_role";

grant insert on table "public"."Questions" to "service_role";

grant references on table "public"."Questions" to "service_role";

grant select on table "public"."Questions" to "service_role";

grant trigger on table "public"."Questions" to "service_role";

grant truncate on table "public"."Questions" to "service_role";

grant update on table "public"."Questions" to "service_role";

grant delete on table "public"."Role" to "anon";

grant insert on table "public"."Role" to "anon";

grant references on table "public"."Role" to "anon";

grant select on table "public"."Role" to "anon";

grant trigger on table "public"."Role" to "anon";

grant truncate on table "public"."Role" to "anon";

grant update on table "public"."Role" to "anon";

grant delete on table "public"."Role" to "authenticated";

grant insert on table "public"."Role" to "authenticated";

grant references on table "public"."Role" to "authenticated";

grant select on table "public"."Role" to "authenticated";

grant trigger on table "public"."Role" to "authenticated";

grant truncate on table "public"."Role" to "authenticated";

grant update on table "public"."Role" to "authenticated";

grant delete on table "public"."Role" to "service_role";

grant insert on table "public"."Role" to "service_role";

grant references on table "public"."Role" to "service_role";

grant select on table "public"."Role" to "service_role";

grant trigger on table "public"."Role" to "service_role";

grant truncate on table "public"."Role" to "service_role";

grant update on table "public"."Role" to "service_role";

grant delete on table "public"."Session" to "anon";

grant insert on table "public"."Session" to "anon";

grant references on table "public"."Session" to "anon";

grant select on table "public"."Session" to "anon";

grant trigger on table "public"."Session" to "anon";

grant truncate on table "public"."Session" to "anon";

grant update on table "public"."Session" to "anon";

grant delete on table "public"."Session" to "authenticated";

grant insert on table "public"."Session" to "authenticated";

grant references on table "public"."Session" to "authenticated";

grant select on table "public"."Session" to "authenticated";

grant trigger on table "public"."Session" to "authenticated";

grant truncate on table "public"."Session" to "authenticated";

grant update on table "public"."Session" to "authenticated";

grant delete on table "public"."Session" to "service_role";

grant insert on table "public"."Session" to "service_role";

grant references on table "public"."Session" to "service_role";

grant select on table "public"."Session" to "service_role";

grant trigger on table "public"."Session" to "service_role";

grant truncate on table "public"."Session" to "service_role";

grant update on table "public"."Session" to "service_role";

grant delete on table "public"."SessionType" to "anon";

grant insert on table "public"."SessionType" to "anon";

grant references on table "public"."SessionType" to "anon";

grant select on table "public"."SessionType" to "anon";

grant trigger on table "public"."SessionType" to "anon";

grant truncate on table "public"."SessionType" to "anon";

grant update on table "public"."SessionType" to "anon";

grant delete on table "public"."SessionType" to "authenticated";

grant insert on table "public"."SessionType" to "authenticated";

grant references on table "public"."SessionType" to "authenticated";

grant select on table "public"."SessionType" to "authenticated";

grant trigger on table "public"."SessionType" to "authenticated";

grant truncate on table "public"."SessionType" to "authenticated";

grant update on table "public"."SessionType" to "authenticated";

grant delete on table "public"."SessionType" to "service_role";

grant insert on table "public"."SessionType" to "service_role";

grant references on table "public"."SessionType" to "service_role";

grant select on table "public"."SessionType" to "service_role";

grant trigger on table "public"."SessionType" to "service_role";

grant truncate on table "public"."SessionType" to "service_role";

grant update on table "public"."SessionType" to "service_role";

grant delete on table "public"."User" to "anon";

grant insert on table "public"."User" to "anon";

grant references on table "public"."User" to "anon";

grant select on table "public"."User" to "anon";

grant trigger on table "public"."User" to "anon";

grant truncate on table "public"."User" to "anon";

grant update on table "public"."User" to "anon";

grant delete on table "public"."User" to "authenticated";

grant insert on table "public"."User" to "authenticated";

grant references on table "public"."User" to "authenticated";

grant select on table "public"."User" to "authenticated";

grant trigger on table "public"."User" to "authenticated";

grant truncate on table "public"."User" to "authenticated";

grant update on table "public"."User" to "authenticated";

grant delete on table "public"."User" to "service_role";

grant insert on table "public"."User" to "service_role";

grant references on table "public"."User" to "service_role";

grant select on table "public"."User" to "service_role";

grant trigger on table "public"."User" to "service_role";

grant truncate on table "public"."User" to "service_role";

grant update on table "public"."User" to "service_role";

grant delete on table "public"."UserRole" to "anon";

grant insert on table "public"."UserRole" to "anon";

grant references on table "public"."UserRole" to "anon";

grant select on table "public"."UserRole" to "anon";

grant trigger on table "public"."UserRole" to "anon";

grant truncate on table "public"."UserRole" to "anon";

grant update on table "public"."UserRole" to "anon";

grant delete on table "public"."UserRole" to "authenticated";

grant insert on table "public"."UserRole" to "authenticated";

grant references on table "public"."UserRole" to "authenticated";

grant select on table "public"."UserRole" to "authenticated";

grant trigger on table "public"."UserRole" to "authenticated";

grant truncate on table "public"."UserRole" to "authenticated";

grant update on table "public"."UserRole" to "authenticated";

grant delete on table "public"."UserRole" to "service_role";

grant insert on table "public"."UserRole" to "service_role";

grant references on table "public"."UserRole" to "service_role";

grant select on table "public"."UserRole" to "service_role";

grant trigger on table "public"."UserRole" to "service_role";

grant truncate on table "public"."UserRole" to "service_role";

grant update on table "public"."UserRole" to "service_role";

grant delete on table "public"."user_email_log" to "anon";

grant insert on table "public"."user_email_log" to "anon";

grant references on table "public"."user_email_log" to "anon";

grant select on table "public"."user_email_log" to "anon";

grant trigger on table "public"."user_email_log" to "anon";

grant truncate on table "public"."user_email_log" to "anon";

grant update on table "public"."user_email_log" to "anon";

grant delete on table "public"."user_email_log" to "authenticated";

grant insert on table "public"."user_email_log" to "authenticated";

grant references on table "public"."user_email_log" to "authenticated";

grant select on table "public"."user_email_log" to "authenticated";

grant trigger on table "public"."user_email_log" to "authenticated";

grant truncate on table "public"."user_email_log" to "authenticated";

grant update on table "public"."user_email_log" to "authenticated";

grant delete on table "public"."user_email_log" to "service_role";

grant insert on table "public"."user_email_log" to "service_role";

grant references on table "public"."user_email_log" to "service_role";

grant select on table "public"."user_email_log" to "service_role";

grant trigger on table "public"."user_email_log" to "service_role";

grant truncate on table "public"."user_email_log" to "service_role";

grant update on table "public"."user_email_log" to "service_role";


  create policy "AvailabilityUpdate"
  on "public"."AvailabilityBlocks"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Enable insert for authenticated users only"
  on "public"."AvailabilityBlocks"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for all users"
  on "public"."AvailabilityBlocks"
  as permissive
  for select
  to public
using (true);



  create policy "Enable admin to insert"
  on "public"."AvailabilitySettings"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = admin_user_id));



  create policy "Enable admin to update"
  on "public"."AvailabilitySettings"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = admin_user_id))
with check ((( SELECT auth.uid() AS uid) = admin_user_id));



  create policy "Enable read access for all users"
  on "public"."AvailabilitySettings"
  as permissive
  for select
  to public
using (true);



  create policy "Enable insert for users based on user_id"
  on "public"."UserRole"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Service role can manage email logs"
  on "public"."user_email_log"
  as permissive
  for all
  to service_role
using (true)
with check (true);


CREATE TRIGGER on_contract_deleted BEFORE DELETE ON public."Contract" FOR EACH ROW EXECUTE FUNCTION public.delete_signed_contract_from_storage();

CREATE TRIGGER on_gallery_published AFTER UPDATE ON public."Gallery" FOR EACH ROW EXECUTE FUNCTION public.notify_client_gallery_ready();

CREATE TRIGGER on_booking_created AFTER UPDATE OF is_active ON public."Session" FOR EACH ROW WHEN (((old.is_active = false) AND (new.is_active = true))) EXECUTE FUNCTION public.notify_client_and_admin_booking_received();

CREATE TRIGGER on_session_confirmed AFTER UPDATE ON public."Session" FOR EACH ROW EXECUTE FUNCTION public.notify_client_session_confirmed();


  create policy "Admin can delete session images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'session-images'::text));



  create policy "Admin can update session images"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'session-images'::text));



  create policy "Admin can upload session images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'session-images'::text));



  create policy "Public can view session images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'session-images'::text));



  create policy "Signed-contracts delete (dev)"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated, service_role
using ((bucket_id = 'Signed-contracts'::text));



  create policy "Signed-contracts read (dev)"
  on "storage"."objects"
  as permissive
  for select
  to authenticated, service_role
using ((bucket_id = 'Signed-contracts'::text));



  create policy "Signed-contracts update (dev)"
  on "storage"."objects"
  as permissive
  for update
  to authenticated, service_role
using ((bucket_id = 'Signed-contracts'::text))
with check ((bucket_id = 'Signed-contracts'::text));



  create policy "Signed-contracts upload (dev)"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated, service_role
with check ((bucket_id = 'Signed-contracts'::text));



  create policy "UploadPhotosToGallery 1io9m69_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'photos'::text));



  create policy "admin settings delete own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'adminSettingsBucket'::text) AND (split_part(name, '/'::text, 1) = 'admins'::text) AND (split_part(name, '/'::text, 2) = (auth.uid())::text)));



  create policy "admin settings insert own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'adminSettingsBucket'::text) AND (split_part(name, '/'::text, 1) = 'admins'::text) AND (split_part(name, '/'::text, 2) = (auth.uid())::text)));



  create policy "admin settings read own"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'adminSettingsBucket'::text) AND (split_part(name, '/'::text, 1) = 'admins'::text) AND (split_part(name, '/'::text, 2) = (auth.uid())::text)));



  create policy "admin settings service role all"
  on "storage"."objects"
  as permissive
  for all
  to service_role
using ((bucket_id = 'adminSettingsBucket'::text))
with check ((bucket_id = 'adminSettingsBucket'::text));



  create policy "admin settings update own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'adminSettingsBucket'::text) AND (split_part(name, '/'::text, 1) = 'admins'::text) AND (split_part(name, '/'::text, 2) = (auth.uid())::text)))
with check (((bucket_id = 'adminSettingsBucket'::text) AND (split_part(name, '/'::text, 1) = 'admins'::text) AND (split_part(name, '/'::text, 2) = (auth.uid())::text)));



  create policy "authenticated_read_photos"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'photos'::text));



