CREATE OR REPLACE FUNCTION delete_signed_contract_from_storage()
RETURNS trigger AS $$
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
      'Authorization', 'Bearer ' || service_role_key
    )
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_contract_deleted ON "Contract";
CREATE TRIGGER on_contract_deleted
BEFORE DELETE ON "Contract"
FOR EACH ROW
EXECUTE FUNCTION delete_signed_contract_from_storage();
