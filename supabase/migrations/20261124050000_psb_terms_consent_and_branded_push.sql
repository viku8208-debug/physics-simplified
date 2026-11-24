-- PSB Terms & Conditions acceptance log and branded phone notifications.

create table if not exists public.terms_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  push_updates_opt_in boolean not null default false,
  consent_source text not null default 'website_signup'
    check (consent_source = 'website_signup')
);

alter table public.terms_acceptances enable row level security;
revoke all on table public.terms_acceptances from anon, authenticated;
grant select on table public.terms_acceptances to authenticated;

drop policy if exists "Users can read their own terms acceptance" on public.terms_acceptances;
create policy "Users can read their own terms acceptance"
  on public.terms_acceptances
  for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function private.record_psb_signup_terms_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false') <> 'true' then
    return new;
  end if;

  insert into public.terms_acceptances (
    user_id,
    terms_version,
    accepted_at,
    push_updates_opt_in,
    consent_source
  )
  values (
    new.id,
    '2026-11-24',
    now(),
    coalesce(new.raw_user_meta_data ->> 'push_notifications_opt_in', 'false') = 'true',
    'website_signup'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.record_psb_signup_terms_consent() from public, anon, authenticated;

drop trigger if exists psb_record_signup_terms_consent on auth.users;
create trigger psb_record_signup_terms_consent
  after insert on auth.users
  for each row execute function private.record_psb_signup_terms_consent();

create or replace function public.dispatch_psb_content_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_config jsonb;
  v_item_id text;
  v_creator_id text;
  v_notification_title text := 'Physics by Suraj Bhardwaj';
  v_notification_body text;
  v_item_text text;
  v_url text;
begin
  v_new := to_jsonb(new);

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    if coalesce((v_old ->> 'is_published')::boolean, false) then
      return new;
    end if;
  end if;

  if not coalesce((v_new ->> 'is_published')::boolean, false) then
    return new;
  end if;

  if tg_table_name = 'announcements'
     and nullif(v_new ->> 'active_from', '') is not null
     and (v_new ->> 'active_from')::timestamptz > now() then
    return new;
  end if;

  v_item_id := coalesce(v_new ->> 'id', '');
  v_creator_id := coalesce(v_new ->> 'created_by', v_new ->> 'uploaded_by');
  v_item_text := left(regexp_replace(coalesce(
    nullif(btrim(v_new ->> 'title'), ''),
    nullif(btrim(v_new ->> 'body'), ''),
    nullif(btrim(v_new ->> 'description'), ''),
    nullif(btrim(v_new ->> 'topic'), ''),
    nullif(btrim(v_new ->> 'subject'), ''),
    'A new study update is available.'
  ), '\s+', ' ', 'g'), 150);

  if tg_table_name = 'posts' then
    v_notification_body := 'New post: ' || v_item_text;
    v_url := '/posts?post=' || v_item_id;
  else
    v_notification_body := case tg_table_name
      when 'notes' then 'New notes: ' || v_item_text
      when 'video_lessons' then 'New video lesson: ' || v_item_text
      when 'resources' then 'New study resource: ' || v_item_text
      when 'quizzes' then 'New quiz or test: ' || v_item_text
      when 'announcements' then 'New announcement: ' || v_item_text
      else 'New study update: ' || v_item_text
    end;

    v_url := case tg_table_name
      when 'notes' then '/notes'
      when 'video_lessons' then '/videos'
      when 'resources' then '/resources'
      when 'quizzes' then '/quizzes'
      else '/'
    end;
  end if;

  select d.decrypted_secret::jsonb
    into v_config
    from vault.decrypted_secrets as d
   where d.name = 'psb_web_push_config'
   order by d.created_at desc
   limit 1;

  if v_config is null or nullif(v_config ->> 'dispatchSecret', '') is null then
    raise warning 'PSB push config is missing; content notification was skipped.';
    return new;
  end if;

  perform net.http_post(
    url := 'https://fsycevlscitytqnoetvw.supabase.co/functions/v1/psb-push',
    body := jsonb_build_object(
      'action', 'dispatch',
      'event_type', tg_table_name,
      'item_id', v_item_id,
      'creator_id', v_creator_id,
      'title', v_notification_title,
      'body', left(v_notification_body, 180),
      'url', v_url,
      'tag', 'psb-' || tg_table_name || '-' || v_item_id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-psb-hook-secret', v_config ->> 'dispatchSecret'
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  raise warning 'PSB push dispatch failed for %.%: %', tg_table_name, coalesce(v_new ->> 'id', 'unknown'), sqlerrm;
  return new;
end;
$$;

revoke all on function public.dispatch_psb_content_push() from public, anon, authenticated;
