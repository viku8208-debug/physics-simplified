-- Keep review author-to-account linkage private while exposing only safe fields.
CREATE TABLE IF NOT EXISTS private.review_authors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id uuid NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE private.review_authors FROM PUBLIC, anon, authenticated;

INSERT INTO private.review_authors (user_id, review_id)
SELECT user_id, id FROM public.reviews
ON CONFLICT DO NOTHING;

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
  NEW.display_name := pg_catalog.btrim(v_full_name);
  NEW.class_level := v_class_level;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.link_review_author()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Sign in before submitting a review.' USING ERRCODE = '42501'; END IF;
  INSERT INTO private.review_authors (user_id, review_id) VALUES (v_user_id, NEW.id);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.prepare_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.link_review_author() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS reviews_prepare_verified_author ON public.reviews;
CREATE TRIGGER reviews_prepare_verified_author BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION private.prepare_review();
DROP TRIGGER IF EXISTS reviews_link_author ON public.reviews;
CREATE TRIGGER reviews_link_author AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION private.link_review_author();

DROP POLICY IF EXISTS reviews_verified_account_insert ON public.reviews;
CREATE POLICY reviews_verified_account_insert ON public.reviews
FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_one_per_user;
ALTER TABLE public.reviews DROP COLUMN IF EXISTS user_id;

REVOKE ALL ON TABLE public.reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.reviews TO anon, authenticated;
GRANT INSERT (rating, comment) ON TABLE public.reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.has_my_review()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
     AND EXISTS (SELECT 1 FROM private.review_authors AS a WHERE a.user_id = (SELECT auth.uid()));
$function$;
REVOKE ALL ON FUNCTION public.has_my_review() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_my_review() TO authenticated;
