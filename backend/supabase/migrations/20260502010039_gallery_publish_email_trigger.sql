CREATE OR REPLACE FUNCTION notify_client_gallery_ready()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_gallery_published ON "Gallery";
CREATE TRIGGER on_gallery_published
  AFTER UPDATE ON "Gallery"
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_gallery_ready();
