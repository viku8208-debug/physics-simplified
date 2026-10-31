-- Reference SQL for the existing Physics Simplified Supabase project.
-- This function has already been applied to the live project as the
-- secure_teacher_self_claim and fix_teacher_claim_function_search_path migrations.
-- Do not re-run the initial project schema/bootstrap SQL against the live database.

create or replace function public.claim_teacher_access()
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_email_confirmed_at timestamptz;
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Sign in before claiming teacher access';
  end if;

  select u.email, u.email_confirmed_at
    into v_email, v_email_confirmed_at
  from auth.users as u
  where u.id = v_user_id
  for update;

  if v_email is null or pg_catalog.lower(v_email) <> 'skumarmuz4@gmail.com' then
    raise exception 'This account is not eligible for teacher access';
  end if;

  if v_email_confirmed_at is null then
    raise exception 'Confirm the teacher email address before claiming access';
  end if;

  insert into private.user_roles (user_id, role)
  values (v_user_id, 'teacher')
  on conflict (user_id, role) do nothing;

  select case when exists (
    select 1 from private.user_roles as r
    where r.user_id = v_user_id and r.role = 'admin'
  ) then 'admin' else 'teacher' end
    into v_role;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || pg_catalog.jsonb_build_object('role', v_role)
  where id = v_user_id;

  return true;
end;
$function$;

revoke all on function public.claim_teacher_access() from public;
revoke all on function public.claim_teacher_access() from anon;
grant execute on function public.claim_teacher_access() to authenticated;

comment on function public.claim_teacher_access() is
  'Allows only the preconfigured, email-confirmed Physics Simplified teacher account to claim the teacher role. No user-supplied email is accepted.';
