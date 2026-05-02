-- Trigger function: fires when admin confirms a session (status changes to 'confirmed')
-- Sends client an email with final session details, highlighting any time or location changes

CREATE OR REPLACE FUNCTION notify_client_session_confirmed()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present, then recreate
DROP TRIGGER IF EXISTS on_session_confirmed ON "Session";
CREATE TRIGGER on_session_confirmed
AFTER UPDATE ON "Session"
FOR EACH ROW
EXECUTE FUNCTION notify_client_session_confirmed();
