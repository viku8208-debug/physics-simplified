-- Opaque PSB resource share links. The private mapping keeps resource IDs and
-- storage object paths out of the public URL. Only staff can create links.

create table if not exists private.resource_share_links (
  share_code text primary key
    check (share_code ~ '^psb-[A-Za-z0-9_-]{16}$'),
  resource_id uuid not null
    references public.resources(id) on delete cascade,
  created_by uuid not null
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table private.resource_share_links enable row level security;
revoke all on table private.resource_share_links from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create unique index if not exists resource_share_links_one_active_per_resource
  on private.resource_share_links(resource_id)
  where revoked_at is null;

create or replace function private.create_resource_share_link(p_resource_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to create a resource link.';
  end if;

  if not private.is_staff() then
    raise exception 'Only the teacher can create resource links.';
  end if;

  if not exists (
    select 1
    from public.resources r
    where r.id = p_resource_id
      and r.is_published = true
  ) then
    raise exception 'This resource is not available for sharing.';
  end if;

  loop
    select l.share_code
      into v_code
    from private.resource_share_links l
    where l.resource_id = p_resource_id
      and l.revoked_at is null
    limit 1;

    if v_code is not null then
      return v_code;
    end if;

    -- 96 random bits, URL-safe and opaque; the PSB prefix identifies the brand.
    v_code := 'psb-' || translate(
      encode(extensions.gen_random_bytes(12), 'base64'),
      '+/',
      '-_'
    );

    insert into private.resource_share_links(share_code, resource_id, created_by)
    values (v_code, p_resource_id, auth.uid())
    on conflict do nothing;

    if found then
      return v_code;
    end if;
  end loop;
end;
$function$;

create or replace function private.resolve_resource_share_link(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'title', r.title,
    'description', r.description,
    'class_level', r.class_level,
    'subject', r.subject,
    'resource_type', r.resource_type,
    'file_path', r.file_path,
    'external_url', r.external_url
  )
  from private.resource_share_links l
  join public.resources r on r.id = l.resource_id
  where l.share_code = p_code
    and l.revoked_at is null
    and r.is_published = true
  limit 1;
$function$;

revoke all on function private.create_resource_share_link(uuid) from public, anon;
grant execute on function private.create_resource_share_link(uuid) to authenticated;
revoke all on function private.resolve_resource_share_link(text) from public;
grant execute on function private.resolve_resource_share_link(text) to anon, authenticated;

create or replace function public.create_resource_share_link(p_resource_id uuid)
returns text
language sql
security invoker
set search_path = ''
as $function$
  select private.create_resource_share_link(p_resource_id);
$function$;

create or replace function public.resolve_resource_share_link(p_code text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.resolve_resource_share_link(p_code);
$function$;

revoke all on function public.create_resource_share_link(uuid) from public, anon;
grant execute on function public.create_resource_share_link(uuid) to authenticated;
revoke all on function public.resolve_resource_share_link(text) from public;
grant execute on function public.resolve_resource_share_link(text) to anon, authenticated;
