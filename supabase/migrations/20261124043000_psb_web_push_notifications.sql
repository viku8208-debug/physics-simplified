-- Web Push notifications for Physics by Suraj Bhardwaj.
-- Private VAPID and dispatch secrets are stored separately in Supabase Vault.

create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 40 and 300),
  auth text not null check (char_length(auth) between 16 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
grant select on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

drop policy if exists "Users can read their own push subscription" on public.push_subscriptions;
create policy "Users can read their own push subscription"
  on public.push_subscriptions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

create or replace function public.get_psb_push_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select d.decrypted_secret::jsonb
  from vault.decrypted_secrets as d
  where d.name = 'psb_web_push_config'
  order by d.created_at desc
  limit 1;
$$;

revoke all on function public.get_psb_push_config() from public, anon, authenticated;
grant execute on function public.get_psb_push_config() to service_role;

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
  v_notification_title text;
  v_notification_body text;
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

  v_notification_title := case tg_table_name
    when 'posts' then 'New post by Suraj Sir'
    when 'notes' then 'New notes uploaded'
    when 'video_lessons' then 'New video lesson'
    when 'resources' then 'New study resource'
    when 'quizzes' then 'New quiz or test'
    when 'announcements' then 'New announcement'
    else 'New study update'
  end;

  if tg_table_name = 'posts' then
    v_notification_body := left(regexp_replace(coalesce(v_new ->> 'body', ''), '\s+', ' ', 'g'), 180);
    v_url := '/posts?post=' || v_item_id;
  else
    v_notification_body := left(coalesce(
      nullif(btrim(v_new ->> 'title'), ''),
      nullif(btrim(v_new ->> 'description'), ''),
      nullif(btrim(v_new ->> 'topic'), ''),
      nullif(btrim(v_new ->> 'subject'), ''),
      'Open the website to view the latest study update.'
    ), 180);

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
      'body', v_notification_body,
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

drop trigger if exists psb_push_posts_publish on public.posts;
create trigger psb_push_posts_publish
  after insert or update of is_published on public.posts
  for each row execute function public.dispatch_psb_content_push();

drop trigger if exists psb_push_notes_publish on public.notes;
create trigger psb_push_notes_publish
  after insert or update of is_published on public.notes
  for each row execute function public.dispatch_psb_content_push();

drop trigger if exists psb_push_resources_publish on public.resources;
create trigger psb_push_resources_publish
  after insert or update of is_published on public.resources
  for each row execute function public.dispatch_psb_content_push();

drop trigger if exists psb_push_video_lessons_publish on public.video_lessons;
create trigger psb_push_video_lessons_publish
  after insert or update of is_published on public.video_lessons
  for each row execute function public.dispatch_psb_content_push();

drop trigger if exists psb_push_quizzes_publish on public.quizzes;
create trigger psb_push_quizzes_publish
  after insert or update of is_published on public.quizzes
  for each row execute function public.dispatch_psb_content_push();

drop trigger if exists psb_push_announcements_publish on public.announcements;
create trigger psb_push_announcements_publish
  after insert or update of is_published on public.announcements
  for each row execute function public.dispatch_psb_content_push();
