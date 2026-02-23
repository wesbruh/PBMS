
  create table "public"."testing" (
    "id" uuid not null default gen_random_uuid(),
    "num" integer not null
      );


CREATE UNIQUE INDEX testing_pkey ON public.testing USING btree (id);

alter table "public"."testing" add constraint "testing_pkey" PRIMARY KEY using index "testing_pkey";

grant delete on table "public"."testing" to "anon";

grant insert on table "public"."testing" to "anon";

grant references on table "public"."testing" to "anon";

grant select on table "public"."testing" to "anon";

grant trigger on table "public"."testing" to "anon";

grant truncate on table "public"."testing" to "anon";

grant update on table "public"."testing" to "anon";

grant delete on table "public"."testing" to "authenticated";

grant insert on table "public"."testing" to "authenticated";

grant references on table "public"."testing" to "authenticated";

grant select on table "public"."testing" to "authenticated";

grant trigger on table "public"."testing" to "authenticated";

grant truncate on table "public"."testing" to "authenticated";

grant update on table "public"."testing" to "authenticated";

grant delete on table "public"."testing" to "service_role";

grant insert on table "public"."testing" to "service_role";

grant references on table "public"."testing" to "service_role";

grant select on table "public"."testing" to "service_role";

grant trigger on table "public"."testing" to "service_role";

grant truncate on table "public"."testing" to "service_role";

grant update on table "public"."testing" to "service_role";


