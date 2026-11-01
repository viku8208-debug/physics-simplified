-- The UI uses a local status hint; database uniqueness remains authoritative.
DROP FUNCTION IF EXISTS public.has_my_review();
ALTER TABLE private.review_authors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.review_authors FROM PUBLIC, anon, authenticated;
