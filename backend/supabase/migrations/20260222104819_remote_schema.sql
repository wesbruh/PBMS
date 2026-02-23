drop policy "read templates (dev)" on "public"."contract_template";

revoke delete on table "public"."contract_template" from "anon";

revoke insert on table "public"."contract_template" from "anon";

revoke references on table "public"."contract_template" from "anon";

revoke select on table "public"."contract_template" from "anon";

revoke trigger on table "public"."contract_template" from "anon";

revoke truncate on table "public"."contract_template" from "anon";

revoke update on table "public"."contract_template" from "anon";

revoke delete on table "public"."contract_template" from "authenticated";

revoke insert on table "public"."contract_template" from "authenticated";

revoke references on table "public"."contract_template" from "authenticated";

revoke select on table "public"."contract_template" from "authenticated";

revoke trigger on table "public"."contract_template" from "authenticated";

revoke truncate on table "public"."contract_template" from "authenticated";

revoke update on table "public"."contract_template" from "authenticated";

revoke delete on table "public"."contract_template" from "service_role";

revoke insert on table "public"."contract_template" from "service_role";

revoke references on table "public"."contract_template" from "service_role";

revoke select on table "public"."contract_template" from "service_role";

revoke trigger on table "public"."contract_template" from "service_role";

revoke truncate on table "public"."contract_template" from "service_role";

revoke update on table "public"."contract_template" from "service_role";

alter table "public"."Contacts" drop constraint "Contacts_phone_key";

alter table "public"."Contract" drop constraint "Contract_signed_by_user_id_fkey";

alter table "public"."contract" drop constraint "contract_template_id_fkey";

alter table "public"."user_email_log" drop constraint "user_email_log_user_id_fkey";

alter table "public"."contract_template" drop constraint "contract_template_pkey";

drop index if exists "public"."Contacts_phone_key";

drop index if exists "public"."contract_template_pkey";

drop index if exists "public"."idx_contract_template_id";

drop index if exists "public"."idx_user_email_log_user_id";

drop table "public"."contract_template";

alter table "public"."Contract" drop column "pdf_url";

alter table "public"."Contract" drop column "signed_by_user_id";

alter table "public"."Contract" add column "assigned_user_id" uuid not null;

alter table "public"."Contract" add column "created_at" timestamp with time zone;

alter table "public"."Contract" add column "signed_pdf_url" text;

alter table "public"."Contract" add column "updated_at" timestamp with time zone;

alter table "public"."Contract" alter column "id" set default gen_random_uuid();

alter table "public"."Contract" alter column "status" set data type text using "status"::text;

alter table "public"."Contract" alter column "template_id" set not null;

alter table "public"."ContractTemplate" drop column "body_md";

alter table "public"."ContractTemplate" add column "body" text default 'When you sign this agreement, you agree to these essential terms: To book your date, you must pay a deposit (retainer) which is non-refundable. The rest of the payment is due 3 days before the photo session. If you cancel, you lose the deposit, and if you cancel within 1 day of the session, the full payment is still required. The Photographer owns the copyright to all photos, and you receive a license to use them for your own personal printing and sharing—you cannot sell the photos, change them (beyond cropping), or enter them in contests. You allow the Photographer to use the photos for their portfolio and promotion, unless you tell us in writing that you do not want us to. If the Photographer has an emergency and cannot perform the service, our responsibility is limited to giving you a full refund of all money you paid.'::text;

alter table "public"."ContractTemplate" alter column "id" set default gen_random_uuid();

alter table "public"."contract" drop column "template_id";

alter table "public"."user_email_log" drop column "user_id";

CREATE UNIQUE INDEX "Contract_session_id_key" ON public."Contract" USING btree (session_id);

alter table "public"."Contract" add constraint "Contract_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES public."User"(id) not valid;

alter table "public"."Contract" validate constraint "Contract_assigned_user_id_fkey";

alter table "public"."Contract" add constraint "Contract_session_id_key" UNIQUE using index "Contract_session_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.notify_client_gallery_ready()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  client_email text;
  client_name  text;
  project_url  text := 'https://zccwrooyhkpkslgqdkvq.supabase.co';
  service_role_key text;
BEGIN
-- Fetch service role key securely from Vault
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';
  -- Only fire when published_link is set for the first time
  IF NEW.published_link IS NOT NULL AND OLD.published_link IS NULL THEN

    -- Walk through to get Gallery -> Session -> User to get client's info
    SELECT
      u.email::text,
      u.first_name || ' ' || COALESCE(u.last_name, '')
    INTO client_email, client_name
    FROM "Session" s
    JOIN "User" u ON u.id = s.client_id
    WHERE s.id = NEW.session_id;

    -- Call the edge function via pg_net
    PERFORM net.http_post(
      url     := project_url || '/functions/v1/send-gallery-upload-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body    := jsonb_build_object(
        'email',       client_email,
        'name',        TRIM(client_name),
        'URL',         NEW.published_link,
        'sessionDate', TO_CHAR(NEW.published_at, 'Month DD, YYYY')
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

CREATE TRIGGER on_gallery_published AFTER UPDATE ON public."Gallery" FOR EACH ROW EXECUTE FUNCTION public.notify_client_gallery_ready();


