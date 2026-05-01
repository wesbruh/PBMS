alter table "public"."Role" alter column "id" set default gen_random_uuid();

alter table "public"."Role" alter column "name" set not null;

alter table "public"."Role" alter column "name" set data type text using "name"::text;

set check_function_bodies = off;

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


