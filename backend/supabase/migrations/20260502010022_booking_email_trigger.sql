CREATE OR REPLACE FUNCTION notify_client_and_admin_booking_received()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_created ON "Session";
CREATE TRIGGER on_booking_created
AFTER UPDATE OF is_active ON "Session"
FOR EACH ROW
WHEN (OLD.is_active = FALSE AND NEW.is_active = TRUE)
EXECUTE FUNCTION notify_client_and_admin_booking_received();

-- verifying trigger exists
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_booking_created';

-- testing email's fire to client and admin
-- INSERT INTO "Session" (
--   id, client_id, session_type_id, start_at, end_at, 
--   location_text, status, created_at, updated_at
-- )
-- VALUES (
--   gen_random_uuid(),
--   '98dab953-4876-42bf-8b09-12d0da39a235',
--   '62ce33b6-50dc-4626-bb04-eb454283a484',
--   '2026-04-03 10:00:00+00',
--   '2026-04-03 12:00:00+00',
--   'emailtest, CA',
--   'Pending',
--   now(),
--   now()
-- );

-- SELECT id, status_code, content, error_msg
-- FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 4;
