-- Physics by Suraj Bhardwaj: immutable identity fields and authentic student reviews.

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_full_name text;
  v_class_level smallint;
BEGIN
  v_full_name := coalesce(
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), '')
  );
  IF (new.raw_user_meta_data ->> 'class_level') IN ('7','8','9','10','11','12') THEN
    v_class_level := (new.raw_user_meta_data ->> 'class_level')::smallint;
  END IF;
  INSERT INTO public.profiles (id, full_name, class_level)
  VALUES (new.id, v_full_name, v_class_level)
  ON CONFLICT (id) DO UPDATE
    SET full_name = coalesce(nullif(pg_catalog.btrim(public.profiles.full_name), ''), excluded.full_name),
        class_level = coalesce(public.profiles.class_level, excluded.class_level);
  RETURN new;
END;
$function$;

UPDATE public.profiles AS p
SET
  full_name = coalesce(
    nullif(pg_catalog.btrim(p.full_name), ''),
    nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'name'), '')
  ),
  class_level = coalesce(
    p.class_level,
    CASE WHEN (u.raw_user_meta_data ->> 'class_level') IN ('7','8','9','10','11','12')
      THEN (u.raw_user_meta_data ->> 'class_level')::smallint ELSE NULL END
  )
FROM auth.users AS u
WHERE u.id = p.id
  AND (p.full_name IS NULL OR pg_catalog.btrim(p.full_name) = '' OR p.class_level IS NULL);

CREATE OR REPLACE FUNCTION private.prevent_profile_identity_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $function$
BEGIN
  IF (new.full_name IS DISTINCT FROM old.full_name
      OR new.class_level IS DISTINCT FROM old.class_level)
     AND (SELECT auth.uid()) = old.id THEN
    RAISE EXCEPTION 'Your registered name and class cannot be changed after account creation.'
      USING ERRCODE = '42501';
  END IF;
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_identity_immutable ON public.profiles;
CREATE TRIGGER profiles_identity_immutable
BEFORE UPDATE OF full_name, class_level ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.prevent_profile_identity_change();

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  class_level smallint,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (pg_catalog.char_length(pg_catalog.btrim(comment)) BETWEEN 8 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_one_per_user UNIQUE (user_id),
  CONSTRAINT reviews_class_level_valid CHECK (class_level IS NULL OR class_level BETWEEN 7 AND 12)
);
CREATE INDEX reviews_created_at_desc_idx ON public.reviews (created_at DESC);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, display_name, class_level, rating, comment, created_at) ON TABLE public.reviews TO anon, authenticated;
GRANT INSERT (rating, comment) ON TABLE public.reviews TO authenticated;

CREATE POLICY reviews_public_read ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reviews_verified_account_insert ON public.reviews
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION private.prepare_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_email_confirmed_at timestamptz;
  v_full_name text;
  v_class_level smallint;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in before submitting a review.' USING ERRCODE = '42501'; END IF;
  SELECT u.email_confirmed_at INTO v_email_confirmed_at FROM auth.users AS u WHERE u.id = v_user_id;
  IF v_email_confirmed_at IS NULL THEN RAISE EXCEPTION 'Verify your email address before submitting a review.' USING ERRCODE = '42501'; END IF;
  SELECT p.full_name, p.class_level INTO v_full_name, v_class_level FROM public.profiles AS p WHERE p.id = v_user_id;
  IF v_full_name IS NULL OR pg_catalog.btrim(v_full_name) = '' THEN
    RAISE EXCEPTION 'Complete your student profile before submitting a review.' USING ERRCODE = '23514';
  END IF;
  NEW.user_id := v_user_id;
  NEW.display_name := pg_catalog.btrim(v_full_name);
  NEW.class_level := v_class_level;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.prepare_review() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER reviews_prepare_verified_author BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION private.prepare_review();

CREATE OR REPLACE FUNCTION public.has_my_review()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.reviews AS r WHERE r.user_id = (SELECT auth.uid()));
$function$;
REVOKE ALL ON FUNCTION public.has_my_review() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_my_review() TO authenticated;

DO $publication$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reviews'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
END;
$publication$;
