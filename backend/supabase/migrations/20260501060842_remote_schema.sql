drop trigger if exists "trg_sync_contacts" on "public"."User";

drop trigger if exists "trg_contract_updated_at" on "public"."contract";

drop policy "Enable read access for all users" on "public"."Role";

drop policy "read clients" on "public"."clients";

drop policy "read contract" on "public"."contract";

drop policy "read contracts (dev)" on "public"."contract";

revoke delete on table "public"."Address" from "anon";

revoke insert on table "public"."Address" from "anon";

revoke references on table "public"."Address" from "anon";

revoke select on table "public"."Address" from "anon";

revoke trigger on table "public"."Address" from "anon";

revoke truncate on table "public"."Address" from "anon";

revoke update on table "public"."Address" from "anon";

revoke delete on table "public"."Address" from "authenticated";

revoke insert on table "public"."Address" from "authenticated";

revoke references on table "public"."Address" from "authenticated";

revoke select on table "public"."Address" from "authenticated";

revoke trigger on table "public"."Address" from "authenticated";

revoke truncate on table "public"."Address" from "authenticated";

revoke update on table "public"."Address" from "authenticated";

revoke delete on table "public"."Address" from "service_role";

revoke insert on table "public"."Address" from "service_role";

revoke references on table "public"."Address" from "service_role";

revoke select on table "public"."Address" from "service_role";

revoke trigger on table "public"."Address" from "service_role";

revoke truncate on table "public"."Address" from "service_role";

revoke update on table "public"."Address" from "service_role";

revoke delete on table "public"."AuditLog" from "anon";

revoke insert on table "public"."AuditLog" from "anon";

revoke references on table "public"."AuditLog" from "anon";

revoke select on table "public"."AuditLog" from "anon";

revoke trigger on table "public"."AuditLog" from "anon";

revoke truncate on table "public"."AuditLog" from "anon";

revoke update on table "public"."AuditLog" from "anon";

revoke delete on table "public"."AuditLog" from "authenticated";

revoke insert on table "public"."AuditLog" from "authenticated";

revoke references on table "public"."AuditLog" from "authenticated";

revoke select on table "public"."AuditLog" from "authenticated";

revoke trigger on table "public"."AuditLog" from "authenticated";

revoke truncate on table "public"."AuditLog" from "authenticated";

revoke update on table "public"."AuditLog" from "authenticated";

revoke delete on table "public"."AuditLog" from "service_role";

revoke insert on table "public"."AuditLog" from "service_role";

revoke references on table "public"."AuditLog" from "service_role";

revoke select on table "public"."AuditLog" from "service_role";

revoke trigger on table "public"."AuditLog" from "service_role";

revoke truncate on table "public"."AuditLog" from "service_role";

revoke update on table "public"."AuditLog" from "service_role";

revoke delete on table "public"."Availability" from "anon";

revoke insert on table "public"."Availability" from "anon";

revoke references on table "public"."Availability" from "anon";

revoke select on table "public"."Availability" from "anon";

revoke trigger on table "public"."Availability" from "anon";

revoke truncate on table "public"."Availability" from "anon";

revoke update on table "public"."Availability" from "anon";

revoke delete on table "public"."Availability" from "authenticated";

revoke insert on table "public"."Availability" from "authenticated";

revoke references on table "public"."Availability" from "authenticated";

revoke select on table "public"."Availability" from "authenticated";

revoke trigger on table "public"."Availability" from "authenticated";

revoke truncate on table "public"."Availability" from "authenticated";

revoke update on table "public"."Availability" from "authenticated";

revoke delete on table "public"."Availability" from "service_role";

revoke insert on table "public"."Availability" from "service_role";

revoke references on table "public"."Availability" from "service_role";

revoke select on table "public"."Availability" from "service_role";

revoke trigger on table "public"."Availability" from "service_role";

revoke truncate on table "public"."Availability" from "service_role";

revoke update on table "public"."Availability" from "service_role";

revoke delete on table "public"."CalendarSync" from "anon";

revoke insert on table "public"."CalendarSync" from "anon";

revoke references on table "public"."CalendarSync" from "anon";

revoke select on table "public"."CalendarSync" from "anon";

revoke trigger on table "public"."CalendarSync" from "anon";

revoke truncate on table "public"."CalendarSync" from "anon";

revoke update on table "public"."CalendarSync" from "anon";

revoke delete on table "public"."CalendarSync" from "authenticated";

revoke insert on table "public"."CalendarSync" from "authenticated";

revoke references on table "public"."CalendarSync" from "authenticated";

revoke select on table "public"."CalendarSync" from "authenticated";

revoke trigger on table "public"."CalendarSync" from "authenticated";

revoke truncate on table "public"."CalendarSync" from "authenticated";

revoke update on table "public"."CalendarSync" from "authenticated";

revoke delete on table "public"."CalendarSync" from "service_role";

revoke insert on table "public"."CalendarSync" from "service_role";

revoke references on table "public"."CalendarSync" from "service_role";

revoke select on table "public"."CalendarSync" from "service_role";

revoke trigger on table "public"."CalendarSync" from "service_role";

revoke truncate on table "public"."CalendarSync" from "service_role";

revoke update on table "public"."CalendarSync" from "service_role";

revoke delete on table "public"."CancellationRequest" from "anon";

revoke insert on table "public"."CancellationRequest" from "anon";

revoke references on table "public"."CancellationRequest" from "anon";

revoke select on table "public"."CancellationRequest" from "anon";

revoke trigger on table "public"."CancellationRequest" from "anon";

revoke truncate on table "public"."CancellationRequest" from "anon";

revoke update on table "public"."CancellationRequest" from "anon";

revoke delete on table "public"."CancellationRequest" from "authenticated";

revoke insert on table "public"."CancellationRequest" from "authenticated";

revoke references on table "public"."CancellationRequest" from "authenticated";

revoke select on table "public"."CancellationRequest" from "authenticated";

revoke trigger on table "public"."CancellationRequest" from "authenticated";

revoke truncate on table "public"."CancellationRequest" from "authenticated";

revoke update on table "public"."CancellationRequest" from "authenticated";

revoke delete on table "public"."CancellationRequest" from "service_role";

revoke insert on table "public"."CancellationRequest" from "service_role";

revoke references on table "public"."CancellationRequest" from "service_role";

revoke select on table "public"."CancellationRequest" from "service_role";

revoke trigger on table "public"."CancellationRequest" from "service_role";

revoke truncate on table "public"."CancellationRequest" from "service_role";

revoke update on table "public"."CancellationRequest" from "service_role";

revoke delete on table "public"."Contacts" from "anon";

revoke insert on table "public"."Contacts" from "anon";

revoke references on table "public"."Contacts" from "anon";

revoke select on table "public"."Contacts" from "anon";

revoke trigger on table "public"."Contacts" from "anon";

revoke truncate on table "public"."Contacts" from "anon";

revoke update on table "public"."Contacts" from "anon";

revoke delete on table "public"."Contacts" from "authenticated";

revoke insert on table "public"."Contacts" from "authenticated";

revoke references on table "public"."Contacts" from "authenticated";

revoke select on table "public"."Contacts" from "authenticated";

revoke trigger on table "public"."Contacts" from "authenticated";

revoke truncate on table "public"."Contacts" from "authenticated";

revoke update on table "public"."Contacts" from "authenticated";

revoke delete on table "public"."Contacts" from "service_role";

revoke insert on table "public"."Contacts" from "service_role";

revoke references on table "public"."Contacts" from "service_role";

revoke select on table "public"."Contacts" from "service_role";

revoke trigger on table "public"."Contacts" from "service_role";

revoke truncate on table "public"."Contacts" from "service_role";

revoke update on table "public"."Contacts" from "service_role";

revoke delete on table "public"."GalleryAccessLog" from "anon";

revoke insert on table "public"."GalleryAccessLog" from "anon";

revoke references on table "public"."GalleryAccessLog" from "anon";

revoke select on table "public"."GalleryAccessLog" from "anon";

revoke trigger on table "public"."GalleryAccessLog" from "anon";

revoke truncate on table "public"."GalleryAccessLog" from "anon";

revoke update on table "public"."GalleryAccessLog" from "anon";

revoke delete on table "public"."GalleryAccessLog" from "authenticated";

revoke insert on table "public"."GalleryAccessLog" from "authenticated";

revoke references on table "public"."GalleryAccessLog" from "authenticated";

revoke select on table "public"."GalleryAccessLog" from "authenticated";

revoke trigger on table "public"."GalleryAccessLog" from "authenticated";

revoke truncate on table "public"."GalleryAccessLog" from "authenticated";

revoke update on table "public"."GalleryAccessLog" from "authenticated";

revoke delete on table "public"."GalleryAccessLog" from "service_role";

revoke insert on table "public"."GalleryAccessLog" from "service_role";

revoke references on table "public"."GalleryAccessLog" from "service_role";

revoke select on table "public"."GalleryAccessLog" from "service_role";

revoke trigger on table "public"."GalleryAccessLog" from "service_role";

revoke truncate on table "public"."GalleryAccessLog" from "service_role";

revoke update on table "public"."GalleryAccessLog" from "service_role";

revoke delete on table "public"."Inquiry" from "anon";

revoke insert on table "public"."Inquiry" from "anon";

revoke references on table "public"."Inquiry" from "anon";

revoke select on table "public"."Inquiry" from "anon";

revoke trigger on table "public"."Inquiry" from "anon";

revoke truncate on table "public"."Inquiry" from "anon";

revoke update on table "public"."Inquiry" from "anon";

revoke delete on table "public"."Inquiry" from "authenticated";

revoke insert on table "public"."Inquiry" from "authenticated";

revoke references on table "public"."Inquiry" from "authenticated";

revoke select on table "public"."Inquiry" from "authenticated";

revoke trigger on table "public"."Inquiry" from "authenticated";

revoke truncate on table "public"."Inquiry" from "authenticated";

revoke update on table "public"."Inquiry" from "authenticated";

revoke delete on table "public"."Inquiry" from "service_role";

revoke insert on table "public"."Inquiry" from "service_role";

revoke references on table "public"."Inquiry" from "service_role";

revoke select on table "public"."Inquiry" from "service_role";

revoke trigger on table "public"."Inquiry" from "service_role";

revoke truncate on table "public"."Inquiry" from "service_role";

revoke update on table "public"."Inquiry" from "service_role";

revoke delete on table "public"."NotificationTemplate" from "anon";

revoke insert on table "public"."NotificationTemplate" from "anon";

revoke references on table "public"."NotificationTemplate" from "anon";

revoke select on table "public"."NotificationTemplate" from "anon";

revoke trigger on table "public"."NotificationTemplate" from "anon";

revoke truncate on table "public"."NotificationTemplate" from "anon";

revoke update on table "public"."NotificationTemplate" from "anon";

revoke delete on table "public"."NotificationTemplate" from "authenticated";

revoke insert on table "public"."NotificationTemplate" from "authenticated";

revoke references on table "public"."NotificationTemplate" from "authenticated";

revoke select on table "public"."NotificationTemplate" from "authenticated";

revoke trigger on table "public"."NotificationTemplate" from "authenticated";

revoke truncate on table "public"."NotificationTemplate" from "authenticated";

revoke update on table "public"."NotificationTemplate" from "authenticated";

revoke delete on table "public"."NotificationTemplate" from "service_role";

revoke insert on table "public"."NotificationTemplate" from "service_role";

revoke references on table "public"."NotificationTemplate" from "service_role";

revoke select on table "public"."NotificationTemplate" from "service_role";

revoke trigger on table "public"."NotificationTemplate" from "service_role";

revoke truncate on table "public"."NotificationTemplate" from "service_role";

revoke update on table "public"."NotificationTemplate" from "service_role";

revoke delete on table "public"."Photo" from "anon";

revoke insert on table "public"."Photo" from "anon";

revoke references on table "public"."Photo" from "anon";

revoke select on table "public"."Photo" from "anon";

revoke trigger on table "public"."Photo" from "anon";

revoke truncate on table "public"."Photo" from "anon";

revoke update on table "public"."Photo" from "anon";

revoke delete on table "public"."Photo" from "authenticated";

revoke insert on table "public"."Photo" from "authenticated";

revoke references on table "public"."Photo" from "authenticated";

revoke select on table "public"."Photo" from "authenticated";

revoke trigger on table "public"."Photo" from "authenticated";

revoke truncate on table "public"."Photo" from "authenticated";

revoke update on table "public"."Photo" from "authenticated";

revoke delete on table "public"."Photo" from "service_role";

revoke insert on table "public"."Photo" from "service_role";

revoke references on table "public"."Photo" from "service_role";

revoke select on table "public"."Photo" from "service_role";

revoke trigger on table "public"."Photo" from "service_role";

revoke truncate on table "public"."Photo" from "service_role";

revoke update on table "public"."Photo" from "service_role";

revoke delete on table "public"."Refund" from "anon";

revoke insert on table "public"."Refund" from "anon";

revoke references on table "public"."Refund" from "anon";

revoke select on table "public"."Refund" from "anon";

revoke trigger on table "public"."Refund" from "anon";

revoke truncate on table "public"."Refund" from "anon";

revoke update on table "public"."Refund" from "anon";

revoke delete on table "public"."Refund" from "authenticated";

revoke insert on table "public"."Refund" from "authenticated";

revoke references on table "public"."Refund" from "authenticated";

revoke select on table "public"."Refund" from "authenticated";

revoke trigger on table "public"."Refund" from "authenticated";

revoke truncate on table "public"."Refund" from "authenticated";

revoke update on table "public"."Refund" from "authenticated";

revoke delete on table "public"."Refund" from "service_role";

revoke insert on table "public"."Refund" from "service_role";

revoke references on table "public"."Refund" from "service_role";

revoke select on table "public"."Refund" from "service_role";

revoke trigger on table "public"."Refund" from "service_role";

revoke truncate on table "public"."Refund" from "service_role";

revoke update on table "public"."Refund" from "service_role";

revoke delete on table "public"."RescheduleRequest" from "anon";

revoke insert on table "public"."RescheduleRequest" from "anon";

revoke references on table "public"."RescheduleRequest" from "anon";

revoke select on table "public"."RescheduleRequest" from "anon";

revoke trigger on table "public"."RescheduleRequest" from "anon";

revoke truncate on table "public"."RescheduleRequest" from "anon";

revoke update on table "public"."RescheduleRequest" from "anon";

revoke delete on table "public"."RescheduleRequest" from "authenticated";

revoke insert on table "public"."RescheduleRequest" from "authenticated";

revoke references on table "public"."RescheduleRequest" from "authenticated";

revoke select on table "public"."RescheduleRequest" from "authenticated";

revoke trigger on table "public"."RescheduleRequest" from "authenticated";

revoke truncate on table "public"."RescheduleRequest" from "authenticated";

revoke update on table "public"."RescheduleRequest" from "authenticated";

revoke delete on table "public"."RescheduleRequest" from "service_role";

revoke insert on table "public"."RescheduleRequest" from "service_role";

revoke references on table "public"."RescheduleRequest" from "service_role";

revoke select on table "public"."RescheduleRequest" from "service_role";

revoke trigger on table "public"."RescheduleRequest" from "service_role";

revoke truncate on table "public"."RescheduleRequest" from "service_role";

revoke update on table "public"."RescheduleRequest" from "service_role";

revoke delete on table "public"."clients" from "anon";

revoke insert on table "public"."clients" from "anon";

revoke references on table "public"."clients" from "anon";

revoke select on table "public"."clients" from "anon";

revoke trigger on table "public"."clients" from "anon";

revoke truncate on table "public"."clients" from "anon";

revoke update on table "public"."clients" from "anon";

revoke delete on table "public"."clients" from "authenticated";

revoke insert on table "public"."clients" from "authenticated";

revoke references on table "public"."clients" from "authenticated";

revoke select on table "public"."clients" from "authenticated";

revoke trigger on table "public"."clients" from "authenticated";

revoke truncate on table "public"."clients" from "authenticated";

revoke update on table "public"."clients" from "authenticated";

revoke delete on table "public"."clients" from "service_role";

revoke insert on table "public"."clients" from "service_role";

revoke references on table "public"."clients" from "service_role";

revoke select on table "public"."clients" from "service_role";

revoke trigger on table "public"."clients" from "service_role";

revoke truncate on table "public"."clients" from "service_role";

revoke update on table "public"."clients" from "service_role";

revoke delete on table "public"."contract" from "anon";

revoke insert on table "public"."contract" from "anon";

revoke references on table "public"."contract" from "anon";

revoke select on table "public"."contract" from "anon";

revoke trigger on table "public"."contract" from "anon";

revoke truncate on table "public"."contract" from "anon";

revoke update on table "public"."contract" from "anon";

revoke delete on table "public"."contract" from "authenticated";

revoke insert on table "public"."contract" from "authenticated";

revoke references on table "public"."contract" from "authenticated";

revoke select on table "public"."contract" from "authenticated";

revoke trigger on table "public"."contract" from "authenticated";

revoke truncate on table "public"."contract" from "authenticated";

revoke update on table "public"."contract" from "authenticated";

revoke delete on table "public"."contract" from "service_role";

revoke insert on table "public"."contract" from "service_role";

revoke references on table "public"."contract" from "service_role";

revoke select on table "public"."contract" from "service_role";

revoke trigger on table "public"."contract" from "service_role";

revoke truncate on table "public"."contract" from "service_role";

revoke update on table "public"."contract" from "service_role";

revoke delete on table "public"."inquiries" from "anon";

revoke insert on table "public"."inquiries" from "anon";

revoke references on table "public"."inquiries" from "anon";

revoke select on table "public"."inquiries" from "anon";

revoke trigger on table "public"."inquiries" from "anon";

revoke truncate on table "public"."inquiries" from "anon";

revoke update on table "public"."inquiries" from "anon";

revoke delete on table "public"."inquiries" from "authenticated";

revoke insert on table "public"."inquiries" from "authenticated";

revoke references on table "public"."inquiries" from "authenticated";

revoke select on table "public"."inquiries" from "authenticated";

revoke trigger on table "public"."inquiries" from "authenticated";

revoke truncate on table "public"."inquiries" from "authenticated";

revoke update on table "public"."inquiries" from "authenticated";

revoke delete on table "public"."inquiries" from "service_role";

revoke insert on table "public"."inquiries" from "service_role";

revoke references on table "public"."inquiries" from "service_role";

revoke select on table "public"."inquiries" from "service_role";

revoke trigger on table "public"."inquiries" from "service_role";

revoke truncate on table "public"."inquiries" from "service_role";

revoke update on table "public"."inquiries" from "service_role";

revoke delete on table "public"."questionnaire" from "anon";

revoke insert on table "public"."questionnaire" from "anon";

revoke references on table "public"."questionnaire" from "anon";

revoke select on table "public"."questionnaire" from "anon";

revoke trigger on table "public"."questionnaire" from "anon";

revoke truncate on table "public"."questionnaire" from "anon";

revoke update on table "public"."questionnaire" from "anon";

revoke delete on table "public"."questionnaire" from "authenticated";

revoke insert on table "public"."questionnaire" from "authenticated";

revoke references on table "public"."questionnaire" from "authenticated";

revoke select on table "public"."questionnaire" from "authenticated";

revoke trigger on table "public"."questionnaire" from "authenticated";

revoke truncate on table "public"."questionnaire" from "authenticated";

revoke update on table "public"."questionnaire" from "authenticated";

revoke delete on table "public"."questionnaire" from "service_role";

revoke insert on table "public"."questionnaire" from "service_role";

revoke references on table "public"."questionnaire" from "service_role";

revoke select on table "public"."questionnaire" from "service_role";

revoke trigger on table "public"."questionnaire" from "service_role";

revoke truncate on table "public"."questionnaire" from "service_role";

revoke update on table "public"."questionnaire" from "service_role";

revoke delete on table "public"."questionnaires" from "anon";

revoke insert on table "public"."questionnaires" from "anon";

revoke references on table "public"."questionnaires" from "anon";

revoke select on table "public"."questionnaires" from "anon";

revoke trigger on table "public"."questionnaires" from "anon";

revoke truncate on table "public"."questionnaires" from "anon";

revoke update on table "public"."questionnaires" from "anon";

revoke delete on table "public"."questionnaires" from "authenticated";

revoke insert on table "public"."questionnaires" from "authenticated";

revoke references on table "public"."questionnaires" from "authenticated";

revoke select on table "public"."questionnaires" from "authenticated";

revoke trigger on table "public"."questionnaires" from "authenticated";

revoke truncate on table "public"."questionnaires" from "authenticated";

revoke update on table "public"."questionnaires" from "authenticated";

revoke delete on table "public"."questionnaires" from "service_role";

revoke insert on table "public"."questionnaires" from "service_role";

revoke references on table "public"."questionnaires" from "service_role";

revoke select on table "public"."questionnaires" from "service_role";

revoke trigger on table "public"."questionnaires" from "service_role";

revoke truncate on table "public"."questionnaires" from "service_role";

revoke update on table "public"."questionnaires" from "service_role";

revoke delete on table "public"."questions" from "anon";

revoke insert on table "public"."questions" from "anon";

revoke references on table "public"."questions" from "anon";

revoke select on table "public"."questions" from "anon";

revoke trigger on table "public"."questions" from "anon";

revoke truncate on table "public"."questions" from "anon";

revoke update on table "public"."questions" from "anon";

revoke delete on table "public"."questions" from "authenticated";

revoke insert on table "public"."questions" from "authenticated";

revoke references on table "public"."questions" from "authenticated";

revoke select on table "public"."questions" from "authenticated";

revoke trigger on table "public"."questions" from "authenticated";

revoke truncate on table "public"."questions" from "authenticated";

revoke update on table "public"."questions" from "authenticated";

revoke delete on table "public"."questions" from "service_role";

revoke insert on table "public"."questions" from "service_role";

revoke references on table "public"."questions" from "service_role";

revoke select on table "public"."questions" from "service_role";

revoke trigger on table "public"."questions" from "service_role";

revoke truncate on table "public"."questions" from "service_role";

revoke update on table "public"."questions" from "service_role";

revoke delete on table "public"."user_notifications" from "anon";

revoke insert on table "public"."user_notifications" from "anon";

revoke references on table "public"."user_notifications" from "anon";

revoke select on table "public"."user_notifications" from "anon";

revoke trigger on table "public"."user_notifications" from "anon";

revoke truncate on table "public"."user_notifications" from "anon";

revoke update on table "public"."user_notifications" from "anon";

revoke delete on table "public"."user_notifications" from "authenticated";

revoke insert on table "public"."user_notifications" from "authenticated";

revoke references on table "public"."user_notifications" from "authenticated";

revoke select on table "public"."user_notifications" from "authenticated";

revoke trigger on table "public"."user_notifications" from "authenticated";

revoke truncate on table "public"."user_notifications" from "authenticated";

revoke update on table "public"."user_notifications" from "authenticated";

revoke delete on table "public"."user_notifications" from "service_role";

revoke insert on table "public"."user_notifications" from "service_role";

revoke references on table "public"."user_notifications" from "service_role";

revoke select on table "public"."user_notifications" from "service_role";

revoke trigger on table "public"."user_notifications" from "service_role";

revoke truncate on table "public"."user_notifications" from "service_role";

revoke update on table "public"."user_notifications" from "service_role";

alter table "public"."Address" drop constraint "Address_user_id_fkey";

alter table "public"."Address" drop constraint "Address_user_id_key";

alter table "public"."AuditLog" drop constraint "AuditLog_actor_user_id_fkey";

alter table "public"."Availability" drop constraint "Availability_admin_user_id_fkey";

alter table "public"."AvailabilityBlocks" drop constraint "AvailabilityBlocks_admin_user_id_fkey";

alter table "public"."CalendarSync" drop constraint "CalendarSync_session_id_fkey";

alter table "public"."CalendarSync" drop constraint "CalendarSync_session_id_key";

alter table "public"."CancellationRequest" drop constraint "CancellationRequest_requested_by_fkey";

alter table "public"."CancellationRequest" drop constraint "CancellationRequest_session_id_fkey";

alter table "public"."Contacts" drop constraint "Contacts_email_key";

alter table "public"."Contacts" drop constraint "contacts_user_fk";

alter table "public"."GalleryAccessLog" drop constraint "GalleryAccessLog_gallery_id_fkey";

alter table "public"."GalleryAccessLog" drop constraint "GalleryAccessLog_user_id_fkey";

alter table "public"."Inquiry" drop constraint "Inquiry_session_type_id_fkey";

alter table "public"."Inquiry" drop constraint "Inquiry_user_id_fkey";

alter table "public"."Notification" drop constraint "Notification_template_id_fkey";

alter table "public"."NotificationTemplate" drop constraint "NotificationTemplate_key_key";

alter table "public"."Photo" drop constraint "Photo_gallery_id_fkey";

alter table "public"."QuestionnaireResponse" drop constraint "QuestionnaireResponse_questionnaire_id_fkey";

alter table "public"."Refund" drop constraint "Refund_payment_id_fkey";

alter table "public"."RescheduleRequest" drop constraint "RescheduleRequest_requested_by_fkey";

alter table "public"."RescheduleRequest" drop constraint "RescheduleRequest_session_id_fkey";

alter table "public"."Session" drop constraint "Session_inquiry_id_fkey";

alter table "public"."clients" drop constraint "clients_email_key";

alter table "public"."contract" drop constraint "contract_user_id_fkey";

alter table "public"."inquiries" drop constraint "inquiries_client_id_fkey";

alter table "public"."questionnaire" drop constraint "Questionnaire_session_id_fkey";

alter table "public"."questionnaire" drop constraint "Questionnaire_template_id_fkey";

alter table "public"."questions" drop constraint "questions_questionnaire_id_fkey";

alter table "public"."user_notifications" drop constraint "user_notifications_user_fk";

alter table "public"."Contract" drop constraint "Contract_assigned_user_id_fkey";

alter table "public"."Contract" drop constraint "Contract_session_id_fkey";

alter table "public"."Contract" drop constraint "Contract_template_id_fkey";

alter table "public"."Gallery" drop constraint "Gallery_session_id_fkey";

alter table "public"."Invoice" drop constraint "Invoice_session_id_fkey";

alter table "public"."Notification" drop constraint "Notification_session_id_fkey";

alter table "public"."Notification" drop constraint "Notification_user_id_fkey";

alter table "public"."Payment" drop constraint "Payment_invoice_id_fkey";

alter table "public"."QuestionnaireTemplate" drop constraint "QuestionnaireTemplate_session_type_id_fkey";

alter table "public"."Session" drop constraint "Session_client_id_fkey";

alter table "public"."Session" drop constraint "Session_session_type_id_fkey";

alter table "public"."UserRole" drop constraint "UserRole_user_id_fkey";

alter table "public"."Address" drop constraint "Address_pkey";

alter table "public"."AuditLog" drop constraint "AuditLog_pkey";

alter table "public"."Availability" drop constraint "Availability_pkey";

alter table "public"."CalendarSync" drop constraint "CalendarSync_pkey";

alter table "public"."CancellationRequest" drop constraint "CancellationRequest_pkey";

alter table "public"."Contacts" drop constraint "Contacts_pkey";

alter table "public"."GalleryAccessLog" drop constraint "GalleryAccessLog_pkey";

alter table "public"."Inquiry" drop constraint "Inquiry_pkey";

alter table "public"."NotificationTemplate" drop constraint "NotificationTemplate_pkey";

alter table "public"."Photo" drop constraint "Photo_pkey";

alter table "public"."QuestionnaireResponse" drop constraint "QuestionnaireResponse_pkey";

alter table "public"."Refund" drop constraint "Refund_pkey";

alter table "public"."RescheduleRequest" drop constraint "RescheduleRequest_pkey";

alter table "public"."clients" drop constraint "clients_pkey";

alter table "public"."contract" drop constraint "contract_pkey";

alter table "public"."inquiries" drop constraint "inquiries_pkey";

alter table "public"."questionnaire" drop constraint "Questionnaire_pkey";

alter table "public"."questionnaires" drop constraint "questionnaires_pkey";

alter table "public"."questions" drop constraint "questions_pkey";

alter table "public"."user_notifications" drop constraint "user_notifications_pkey";

drop index if exists "public"."Address_pkey";

drop index if exists "public"."Address_user_id_key";

drop index if exists "public"."AuditLog_pkey";

drop index if exists "public"."Availability_pkey";

drop index if exists "public"."CalendarSync_pkey";

drop index if exists "public"."CalendarSync_session_id_key";

drop index if exists "public"."CancellationRequest_pkey";

drop index if exists "public"."Contacts_email_key";

drop index if exists "public"."Contacts_pkey";

drop index if exists "public"."GalleryAccessLog_pkey";

drop index if exists "public"."Inquiry_pkey";

drop index if exists "public"."NotificationTemplate_key_key";

drop index if exists "public"."NotificationTemplate_pkey";

drop index if exists "public"."Photo_pkey";

drop index if exists "public"."QuestionnaireResponse_pkey";

drop index if exists "public"."Refund_pkey";

drop index if exists "public"."RescheduleRequest_pkey";

drop index if exists "public"."clients_email_key";

drop index if exists "public"."clients_pkey";

drop index if exists "public"."contract_pkey";

drop index if exists "public"."idx_contract_hellosign_request_id";

drop index if exists "public"."idx_contract_status";

drop index if exists "public"."idx_contract_user_id";

drop index if exists "public"."inquiries_pkey";

drop index if exists "public"."questionnaires_pkey";

drop index if exists "public"."user_notifications_pkey";

drop index if exists "public"."Questionnaire_pkey";

drop index if exists "public"."questions_pkey";

drop table "public"."Address";

drop table "public"."AuditLog";

drop table "public"."Availability";

drop table "public"."CalendarSync";

drop table "public"."CancellationRequest";

drop table "public"."Contacts";

drop table "public"."GalleryAccessLog";

drop table "public"."Inquiry";

drop table "public"."NotificationTemplate";

drop table "public"."Photo";

drop table "public"."Refund";

drop table "public"."RescheduleRequest";

drop table "public"."clients";

drop table "public"."contract";

drop table "public"."inquiries";

drop table "public"."questionnaire";

drop table "public"."questionnaires";

drop table "public"."questions";

drop table "public"."user_notifications";


  create table "public"."QuestionnaireAnswer" (
    "questionnaire_id" uuid not null,
    "answer" text,
    "question_id" uuid not null,
    "question" jsonb not null default '{}'::jsonb
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


alter table "public"."AvailabilityBlocks" drop column "admin_user_id";

alter table "public"."AvailabilityBlocks" drop column "is_available";

alter table "public"."AvailabilityBlocks" drop column "note";

alter table "public"."Contract" add column "is_active" boolean default false;

alter table "public"."Contract" alter column "status" set default 'Draft'::text;

alter table "public"."Contract" alter column "template_id" drop not null;

alter table "public"."ContractTemplate" add column "is_deleted" boolean default false;

alter table "public"."ContractTemplate" add column "session_type_id" uuid;

alter table "public"."Gallery" add column "cover_photo_path" text;

alter table "public"."Gallery" add column "cover_photo_url" text;

alter table "public"."Gallery" add column "personalized_message" text;

alter table "public"."Invoice" drop column "client_email";

alter table "public"."Invoice" drop column "client_name";

alter table "public"."Invoice" drop column "notes";

alter table "public"."Invoice" drop column "subtotal";

alter table "public"."Invoice" drop column "tax";

alter table "public"."Invoice" drop column "total";

alter table "public"."Invoice" add column "remaining" numeric default '0'::numeric;

alter table "public"."Invoice" alter column "invoice_number" set data type text using "invoice_number"::text;

alter table "public"."Invoice" alter column "status" set default 'Unpaid'::character varying;

alter table "public"."Notification" drop column "provider_message_id";

alter table "public"."Notification" drop column "template_id";

alter table "public"."Notification" alter column "created_at" set default now();

alter table "public"."Notification" alter column "id" set default gen_random_uuid();

alter table "public"."Payment" drop column "receipt_url";

alter table "public"."Payment" add column "type" text;

alter table "public"."Payment" alter column "id" set default gen_random_uuid();

alter table "public"."Payment" alter column "provider_payment_id" set data type text using "provider_payment_id"::text;

alter table "public"."QuestionnaireResponse" drop column "answers_json";

alter table "public"."QuestionnaireResponse" drop column "questionnaire_id";

alter table "public"."QuestionnaireResponse" add column "session_id" uuid;

alter table "public"."QuestionnaireResponse" add column "status" character varying(20);

alter table "public"."QuestionnaireResponse" add column "submitted_at" timestamp with time zone;

alter table "public"."QuestionnaireResponse" add column "template_id" uuid;

alter table "public"."QuestionnaireResponse" alter column "id" set default gen_random_uuid();

alter table "public"."QuestionnaireTemplate" alter column "id" set default gen_random_uuid();

alter table "public"."Session" drop column "inquiry_id";

alter table "public"."Session" add column "is_active" boolean default false;

alter table "public"."SessionType" add column "bullet_points" text[];

alter table "public"."SessionType" add column "category" text not null default 'General'::text;

alter table "public"."SessionType" add column "display_order" integer default 0;

alter table "public"."SessionType" add column "image_path" text;

alter table "public"."SessionType" add column "is_master" boolean default false;

alter table "public"."SessionType" add column "price_label" character varying(80);

alter table "public"."SessionType" alter column "id" set default gen_random_uuid();

alter table "public"."User" drop column "password_hash";

alter table "public"."User" drop column "password_salt";

alter table "public"."User" drop column "updated_at";

CREATE UNIQUE INDEX "Invoice_session_id_key" ON public."Invoice" USING btree (session_id);

CREATE UNIQUE INDEX "Payment_provider_payment_id_key" ON public."Payment" USING btree (provider_payment_id);

CREATE UNIQUE INDEX "QuestionnaireAnswer_pkey" ON public."QuestionnaireAnswer" USING btree (questionnaire_id, question_id);

CREATE UNIQUE INDEX "Questionnaire_pkey" ON public."QuestionnaireResponse" USING btree (id);

CREATE UNIQUE INDEX questions_pkey ON public."Questions" USING btree (id);

alter table "public"."QuestionnaireAnswer" add constraint "QuestionnaireAnswer_pkey" PRIMARY KEY using index "QuestionnaireAnswer_pkey";

alter table "public"."QuestionnaireResponse" add constraint "Questionnaire_pkey" PRIMARY KEY using index "Questionnaire_pkey";

alter table "public"."Questions" add constraint "questions_pkey" PRIMARY KEY using index "questions_pkey";

alter table "public"."ContractTemplate" add constraint "ContractTemplate_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) not valid;

alter table "public"."ContractTemplate" validate constraint "ContractTemplate_session_type_id_fkey";

alter table "public"."Invoice" add constraint "Invoice_session_id_key" UNIQUE using index "Invoice_session_id_key";

alter table "public"."Payment" add constraint "Payment_provider_payment_id_key" UNIQUE using index "Payment_provider_payment_id_key";

alter table "public"."QuestionnaireAnswer" add constraint "QuestionnaireAnswer_questionnaire_id_fkey" FOREIGN KEY (questionnaire_id) REFERENCES public."QuestionnaireResponse"(id) ON DELETE CASCADE not valid;

alter table "public"."QuestionnaireAnswer" validate constraint "QuestionnaireAnswer_questionnaire_id_fkey";

alter table "public"."QuestionnaireResponse" add constraint "Questionnaire_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."QuestionnaireTemplate"(id) ON DELETE SET NULL not valid;

alter table "public"."QuestionnaireResponse" validate constraint "Questionnaire_template_id_fkey";

alter table "public"."QuestionnaireResponse" add constraint "questionnaire_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."QuestionnaireResponse" validate constraint "questionnaire_session_id_fkey";

alter table "public"."Questions" add constraint "questions_questionnaire_id_fkey" FOREIGN KEY (questionnaire_id) REFERENCES public."QuestionnaireTemplate"(id) ON DELETE CASCADE not valid;

alter table "public"."Questions" validate constraint "questions_questionnaire_id_fkey";

alter table "public"."Contract" add constraint "Contract_assigned_user_id_fkey" FOREIGN KEY (assigned_user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."Contract" validate constraint "Contract_assigned_user_id_fkey";

alter table "public"."Contract" add constraint "Contract_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Contract" validate constraint "Contract_session_id_fkey";

alter table "public"."Contract" add constraint "Contract_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public."ContractTemplate"(id) ON DELETE CASCADE not valid;

alter table "public"."Contract" validate constraint "Contract_template_id_fkey";

alter table "public"."Gallery" add constraint "Gallery_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Gallery" validate constraint "Gallery_session_id_fkey";

alter table "public"."Invoice" add constraint "Invoice_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Invoice" validate constraint "Invoice_session_id_fkey";

alter table "public"."Notification" add constraint "Notification_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public."Session"(id) ON DELETE CASCADE not valid;

alter table "public"."Notification" validate constraint "Notification_session_id_fkey";

alter table "public"."Notification" add constraint "Notification_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."Notification" validate constraint "Notification_user_id_fkey";

alter table "public"."Payment" add constraint "Payment_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public."Invoice"(id) ON DELETE CASCADE not valid;

alter table "public"."Payment" validate constraint "Payment_invoice_id_fkey";

alter table "public"."QuestionnaireTemplate" add constraint "QuestionnaireTemplate_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) ON DELETE SET NULL not valid;

alter table "public"."QuestionnaireTemplate" validate constraint "QuestionnaireTemplate_session_type_id_fkey";

alter table "public"."Session" add constraint "Session_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."Session" validate constraint "Session_client_id_fkey";

alter table "public"."Session" add constraint "Session_session_type_id_fkey" FOREIGN KEY (session_type_id) REFERENCES public."SessionType"(id) ON DELETE SET NULL not valid;

alter table "public"."Session" validate constraint "Session_session_type_id_fkey";

alter table "public"."UserRole" add constraint "UserRole_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE CASCADE not valid;

alter table "public"."UserRole" validate constraint "UserRole_user_id_fkey";

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


CREATE TRIGGER on_contract_deleted BEFORE DELETE ON public."Contract" FOR EACH ROW EXECUTE FUNCTION public.delete_signed_contract_from_storage();

CREATE TRIGGER on_booking_created AFTER UPDATE OF is_active ON public."Session" FOR EACH ROW WHEN (((old.is_active = false) AND (new.is_active = true))) EXECUTE FUNCTION public.notify_client_and_admin_booking_received();

CREATE TRIGGER on_session_confirmed AFTER UPDATE ON public."Session" FOR EACH ROW EXECUTE FUNCTION public.notify_client_session_confirmed();

drop policy "Signed-contracts delete (dev)" on "storage"."objects";

drop policy "Signed-contracts read (dev)" on "storage"."objects";

drop policy "Signed-contracts update (dev)" on "storage"."objects";

drop policy "Signed-contracts upload (dev)" on "storage"."objects";


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



