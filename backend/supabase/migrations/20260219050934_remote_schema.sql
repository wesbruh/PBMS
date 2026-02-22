revoke delete on table "public"."testing" from "anon";

revoke insert on table "public"."testing" from "anon";

revoke references on table "public"."testing" from "anon";

revoke select on table "public"."testing" from "anon";

revoke trigger on table "public"."testing" from "anon";

revoke truncate on table "public"."testing" from "anon";

revoke update on table "public"."testing" from "anon";

revoke delete on table "public"."testing" from "authenticated";

revoke insert on table "public"."testing" from "authenticated";

revoke references on table "public"."testing" from "authenticated";

revoke select on table "public"."testing" from "authenticated";

revoke trigger on table "public"."testing" from "authenticated";

revoke truncate on table "public"."testing" from "authenticated";

revoke update on table "public"."testing" from "authenticated";

revoke delete on table "public"."testing" from "service_role";

revoke insert on table "public"."testing" from "service_role";

revoke references on table "public"."testing" from "service_role";

revoke select on table "public"."testing" from "service_role";

revoke trigger on table "public"."testing" from "service_role";

revoke truncate on table "public"."testing" from "service_role";

revoke update on table "public"."testing" from "service_role";

alter table "public"."testing" drop constraint "testing_pkey";

drop index if exists "public"."testing_pkey";

drop table "public"."testing";


