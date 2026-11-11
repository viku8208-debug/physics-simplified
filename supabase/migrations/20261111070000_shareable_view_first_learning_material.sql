-- Shareable, view-first links for published notes, videos and resources.
-- The opaque URL keeps database IDs and Storage paths out of the address bar.
create table if not exists private.content_share_links (
  share_code text primary key check (share_code ~ '^psb-[A-Za-z0-9_-]{16}$'),
  content_type text not null check (content_type = any (array['notes'::text, 'videos'::text, 'resources'::text])),
  content_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table private.content_share_links enable row level security;
revoke all on table private.content_share_links from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
create unique index if not exists content_share_links_one_active_per_item
  on private.content_share_links(content_type, content_id) where revoked_at is null;

create or replace function private.create_content_share_link(p_content_type text, p_content_id uuid)
returns text language plpgsql security definer set search_path = ''
as $function$
declare v_code text; v_published boolean := false;
begin
  if p_content_type not in ('notes', 'videos', 'resources') then raise exception 'Unsupported content type.'; end if;
  if p_content_type = 'notes' then
    select n.is_published into v_published from public.notes n where n.id = p_content_id;
  elsif p_content_type = 'videos' then
    select v.is_published into v_published from public.video_lessons v where v.id = p_content_id;
  else
    select r.is_published into v_published from public.resources r where r.id = p_content_id;
  end if;
  if coalesce(v_published, false) is not true then raise exception 'This item is not published and cannot be shared.'; end if;
  loop
    select l.share_code into v_code from private.content_share_links l
    where l.content_type = p_content_type and l.content_id = p_content_id and l.revoked_at is null limit 1;
    if v_code is not null then return v_code; end if;
    v_code := 'psb-' || translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/', '-_');
    insert into private.content_share_links(share_code, content_type, content_id, created_by)
    values (v_code, p_content_type, p_content_id, auth.uid()) on conflict do nothing;
    if found then return v_code; end if;
  end loop;
end;
$function$;

create or replace function private.resolve_content_share_link(p_code text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_type text; v_id uuid; v_result jsonb;
begin
  if p_code !~ '^psb-[A-Za-z0-9_-]{16}$' then return null; end if;
  select l.content_type, l.content_id into v_type, v_id
  from private.content_share_links l where l.share_code = p_code and l.revoked_at is null limit 1;
  if not found then return null; end if;
  if v_type = 'notes' then
    select jsonb_build_object('content_type','notes','title',n.title,'description',n.description,'grade_label',n.grade_label,
      'subject',n.subject,'topic',n.topic,'content',n.content,'file_path',n.file_path,'external_url',n.external_url)
    into v_result from public.notes n where n.id = v_id and n.is_published = true;
  elsif v_type = 'videos' then
    select jsonb_build_object('content_type','videos','title',v.title,'description',v.description,'grade_label',v.grade_label,
      'subject',v.subject,'topic',v.topic,'video_url',v.video_url)
    into v_result from public.video_lessons v where v.id = v_id and v.is_published = true;
  elsif v_type = 'resources' then
    select jsonb_build_object('content_type','resources','title',r.title,'description',r.description,'class_level',r.class_level,
      'subject',r.subject,'resource_type',r.resource_type,'file_path',r.file_path,'external_url',r.external_url)
    into v_result from public.resources r where r.id = v_id and r.is_published = true;
  end if;
  return v_result;
end;
$function$;

revoke all on function private.create_content_share_link(text, uuid) from public;
revoke all on function private.resolve_content_share_link(text) from public;
grant execute on function private.create_content_share_link(text, uuid) to anon, authenticated;
grant execute on function private.resolve_content_share_link(text) to anon, authenticated;

create or replace function public.create_content_share_link(p_content_type text, p_content_id uuid)
returns text language sql security invoker set search_path = ''
as $function$ select private.create_content_share_link(p_content_type, p_content_id); $function$;
create or replace function public.resolve_content_share_link(p_code text)
returns jsonb language sql stable security invoker set search_path = ''
as $function$ select private.resolve_content_share_link(p_code); $function$;
revoke all on function public.create_content_share_link(text, uuid) from public;
revoke all on function public.resolve_content_share_link(text) from public;
grant execute on function public.create_content_share_link(text, uuid) to anon, authenticated;
grant execute on function public.resolve_content_share_link(text) to anon, authenticated;
