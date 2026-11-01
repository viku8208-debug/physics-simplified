-- Prevent direct browser/API access to the private review author mapping.
DROP POLICY IF EXISTS private_review_authors_deny_client_access ON private.review_authors;
CREATE POLICY private_review_authors_deny_client_access
  ON private.review_authors
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);
