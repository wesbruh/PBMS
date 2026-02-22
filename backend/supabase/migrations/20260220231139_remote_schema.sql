create extension if not exists "pgtap" with schema "public";

drop trigger if exists "trg_sync_contacts" on "public"."User";

drop trigger if exists "trg_contract_updated_at" on "public"."contract";

alter table "public"."Address" drop constraint "Address_user_id_fkey";

alter table "public"."AuditLog" drop constraint "AuditLog_actor_user_id_fkey";

alter table "public"."Availability" drop constraint "Availability_admin_user_id_fkey";

alter table "public"."AvailabilityBlocks" drop constraint "AvailabilityBlocks_admin_user_id_fkey";

alter table "public"."AvailabilitySettings" drop constraint "AvailabilitySettings_admin_user_id_fkey";

alter table "public"."CalendarSync" drop constraint "CalendarSync_session_id_fkey";

alter table "public"."CancellationRequest" drop constraint "CancellationRequest_requested_by_fkey";

alter table "public"."CancellationRequest" drop constraint "CancellationRequest_session_id_fkey";

alter table "public"."Contacts" drop constraint "contacts_user_fk";

alter table "public"."Contract" drop constraint "Contract_session_id_fkey";

alter table "public"."Contract" drop constraint "Contract_signed_by_user_id_fkey";

alter table "public"."Contract" drop constraint "Contract_template_id_fkey";

alter table "public"."Gallery" drop constraint "Gallery_session_id_fkey";

alter table "public"."GalleryAccessLog" drop constraint "GalleryAccessLog_gallery_id_fkey";

alter table "public"."GalleryAccessLog" drop constraint "GalleryAccessLog_user_id_fkey";

alter table "public"."Inquiry" drop constraint "Inquiry_session_type_id_fkey";

alter table "public"."Inquiry" drop constraint "Inquiry_user_id_fkey";

alter table "public"."Invoice" drop constraint "Invoice_session_id_fkey";

alter table "public"."Notification" drop constraint "Notification_session_id_fkey";

alter table "public"."Notification" drop constraint "Notification_template_id_fkey";

alter table "public"."Notification" drop constraint "Notification_user_id_fkey";

alter table "public"."Payment" drop constraint "Payment_invoice_id_fkey";

alter table "public"."Photo" drop constraint "Photo_gallery_id_fkey";

alter table "public"."QuestionnaireResponse" drop constraint "QuestionnaireResponse_questionnaire_id_fkey";

alter table "public"."QuestionnaireTemplate" drop constraint "QuestionnaireTemplate_session_type_id_fkey";

alter table "public"."Refund" drop constraint "Refund_payment_id_fkey";

alter table "public"."RescheduleRequest" drop constraint "RescheduleRequest_requested_by_fkey";

alter table "public"."RescheduleRequest" drop constraint "RescheduleRequest_session_id_fkey";

alter table "public"."Session" drop constraint "Session_client_id_fkey";

alter table "public"."Session" drop constraint "Session_inquiry_id_fkey";

alter table "public"."Session" drop constraint "Session_session_type_id_fkey";

alter table "public"."UserRole" drop constraint "UserRole_role_id_fkey";

alter table "public"."UserRole" drop constraint "UserRole_user_id_fkey";

alter table "public"."contract" drop constraint "contract_template_id_fkey";

alter table "public"."contract" drop constraint "contract_user_id_fkey";

alter table "public"."inquiries" drop constraint "inquiries_client_id_fkey";

alter table "public"."questionnaire" drop constraint "Questionnaire_session_id_fkey";

alter table "public"."questionnaire" drop constraint "Questionnaire_template_id_fkey";

alter table "public"."questions" drop constraint "questions_questionnaire_id_fkey";

alter table "public"."user_notifications" drop constraint "user_notifications_user_fk";

alter table "public"."AvailabilityBlocks" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."AvailabilitySettings" alter column "id" set default extensions.uuid_generate_v4();

alter table "public"."Contacts" alter column "email" set data type public.citext using "email"::public.citext;

alter table "public"."Inquiry" alter column "email" set data type public.citext using "email"::public.citext;

alter table "public"."User" alter column "email" set data type public.citext using "email"::public.citext;

alter table "public"."Address" add constraint "Address_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) not valid;

alter table "public"."Address" validate constraint "Address_user_id_fkey";

alter table "public"."AuditLog" add constraint "AuditLog_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES public."User"(id) not valid;

alter table "public"."AuditLog" validate constraint "AuditLog_actor_user_id_fkey";

alter table "public"."Availability" add constraint "Availability_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES public."User"(id) not valid;

alter table "public"."Availability" validate constraint "Availability_admin_user_id_fkey";

alter table "public"."AvailabilityBlocks" add constraint "AvailabilityBlocks_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES public."User"(id) not valid;

alter table "public"."AvailabilityBlocks" validate constraint "AvailabilityBlocks_admin_user_id_fkey";

alter table "public"."AvailabilitySettings" add constraint "AvailabilitySettings_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES public."User"(id) not valid;

alter table "public"."AvailabilitySettings" validate constraint "AvailabilitySettings_admin_user_id_fkey";

alter table "public"."CalendarSync" add constraint "CalendarSync_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."CalendarSync" validate constraint "CalendarSync_session_id_fkey";

alter table "public"."CancellationRequest" add constraint "CancellationRequest_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public."User"(id) not valid;

alter table "public"."CancellationRequest" validate constraint "CancellationRequest_requested_by_fkey";

alter table "public"."CancellationRequest" add constraint "CancellationRequest_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."CancellationRequest" validate constraint "CancellationRequest_session_id_fkey";

alter table "public"."Contacts" add constraint "contacts_user_fk" FOREIGN KEY (id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."Contacts" validate constraint "contacts_user_fk";

alter table "public"."Contract" add constraint "Contract_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."Contract" validate constraint "Contract_session_id_fkey";

alter table "public"."Contract" add constraint "Contract_signed_by_user_id_fkey" FOREIGN KEY (signed_by_user_id) REFERENCES public."User"(id) not valid;

alter table "public"."Contract" validate constraint "Contract_signed_by_user_id_fkey";

alter table "public"."Contract" add constraint "Contract_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."ContractTemplate"(id) not valid;

alter table "public"."Contract" validate constraint "Contract_template_id_fkey";

alter table "public"."Gallery" add constraint "Gallery_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."Gallery" validate constraint "Gallery_session_id_fkey";

alter table "public"."GalleryAccessLog" add constraint "GalleryAccessLog_gallery_id_fkey" FOREIGN KEY (gallery_id) REFERENCES public."Gallery"(id) not valid;

alter table "public"."GalleryAccessLog" validate constraint "GalleryAccessLog_gallery_id_fkey";

alter table "public"."GalleryAccessLog" add constraint "GalleryAccessLog_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) not valid;

alter table "public"."GalleryAccessLog" validate constraint "GalleryAccessLog_user_id_fkey";

alter table "public"."Inquiry" add constraint "Inquiry_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) not valid;

alter table "public"."Inquiry" validate constraint "Inquiry_session_type_id_fkey";

alter table "public"."Inquiry" add constraint "Inquiry_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) not valid;

alter table "public"."Inquiry" validate constraint "Inquiry_user_id_fkey";

alter table "public"."Invoice" add constraint "Invoice_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."Invoice" validate constraint "Invoice_session_id_fkey";

alter table "public"."Notification" add constraint "Notification_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."Notification" validate constraint "Notification_session_id_fkey";

alter table "public"."Notification" add constraint "Notification_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."NotificationTemplate"(id) not valid;

alter table "public"."Notification" validate constraint "Notification_template_id_fkey";

alter table "public"."Notification" add constraint "Notification_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) not valid;

alter table "public"."Notification" validate constraint "Notification_user_id_fkey";

alter table "public"."Payment" add constraint "Payment_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public."Invoice"(id) not valid;

alter table "public"."Payment" validate constraint "Payment_invoice_id_fkey";

alter table "public"."Photo" add constraint "Photo_gallery_id_fkey" FOREIGN KEY (gallery_id) REFERENCES public."Gallery"(id) not valid;

alter table "public"."Photo" validate constraint "Photo_gallery_id_fkey";

alter table "public"."QuestionnaireResponse" add constraint "QuestionnaireResponse_questionnaire_id_fkey" FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaire(id) not valid;

alter table "public"."QuestionnaireResponse" validate constraint "QuestionnaireResponse_questionnaire_id_fkey";

alter table "public"."QuestionnaireTemplate" add constraint "QuestionnaireTemplate_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) not valid;

alter table "public"."QuestionnaireTemplate" validate constraint "QuestionnaireTemplate_session_type_id_fkey";

alter table "public"."Refund" add constraint "Refund_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public."Payment"(id) not valid;

alter table "public"."Refund" validate constraint "Refund_payment_id_fkey";

alter table "public"."RescheduleRequest" add constraint "RescheduleRequest_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES public."User"(id) not valid;

alter table "public"."RescheduleRequest" validate constraint "RescheduleRequest_requested_by_fkey";

alter table "public"."RescheduleRequest" add constraint "RescheduleRequest_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."RescheduleRequest" validate constraint "RescheduleRequest_session_id_fkey";

alter table "public"."Session" add constraint "Session_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public."User"(id) not valid;

alter table "public"."Session" validate constraint "Session_client_id_fkey";

alter table "public"."Session" add constraint "Session_inquiry_id_fkey" FOREIGN KEY (inquiry_id) REFERENCES public."Inquiry"(id) not valid;

alter table "public"."Session" validate constraint "Session_inquiry_id_fkey";

alter table "public"."Session" add constraint "Session_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) not valid;

alter table "public"."Session" validate constraint "Session_session_type_id_fkey";

alter table "public"."UserRole" add constraint "UserRole_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public."Role"(id) not valid;

alter table "public"."UserRole" validate constraint "UserRole_role_id_fkey";

alter table "public"."UserRole" add constraint "UserRole_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) not valid;

alter table "public"."UserRole" validate constraint "UserRole_user_id_fkey";

alter table "public"."contract" add constraint "contract_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.contract_template(id) not valid;

alter table "public"."contract" validate constraint "contract_template_id_fkey";

alter table "public"."contract" add constraint "contract_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.clients(id) ON DELETE CASCADE not valid;

alter table "public"."contract" validate constraint "contract_user_id_fkey";

alter table "public"."inquiries" add constraint "inquiries_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE not valid;

alter table "public"."inquiries" validate constraint "inquiries_client_id_fkey";

alter table "public"."questionnaire" add constraint "Questionnaire_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) not valid;

alter table "public"."questionnaire" validate constraint "Questionnaire_session_id_fkey";

alter table "public"."questionnaire" add constraint "Questionnaire_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."QuestionnaireTemplate"(id) not valid;

alter table "public"."questionnaire" validate constraint "Questionnaire_template_id_fkey";

alter table "public"."questions" add constraint "questions_questionnaire_id_fkey" FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE CASCADE not valid;

alter table "public"."questions" validate constraint "questions_questionnaire_id_fkey";

alter table "public"."user_notifications" add constraint "user_notifications_user_fk" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."user_notifications" validate constraint "user_notifications_user_fk";

set check_function_bodies = off;

create type "public"."_time_trial_type" as ("a_time" numeric);

CREATE OR REPLACE FUNCTION public.sync_contacts_from_user()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public."Contacts" (id, first_name, last_name, email, phone)
    VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.email, NEW.phone)
    ON CONFLICT (id) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name  = EXCLUDED.last_name,
          email      = EXCLUDED.email,
          phone      = EXCLUDED.phone;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    UPDATE public."Contacts"
    SET first_name = NEW.first_name,
        last_name  = NEW.last_name,
        email      = NEW.email,
        phone      = NEW.phone
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;
  
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public."Contacts"
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;


  RETURN NEW;
END;
$function$
;

CREATE TRIGGER trg_sync_contacts AFTER INSERT OR DELETE OR UPDATE ON public."User" FOR EACH ROW EXECUTE FUNCTION public.sync_contacts_from_user();

CREATE TRIGGER trg_contract_updated_at BEFORE UPDATE ON public.contract FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


