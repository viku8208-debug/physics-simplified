# Source and verification status

- The source is a React + TypeScript + Vite learning portal with student pages and a protected `/admin` workspace.
- The site connects to the existing Supabase project through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Only the browser-safe publishable key belongs in frontend configuration. Never add a Supabase secret/service-role key or `.env.local` to Git.
- The existing Supabase project has the content tables, RLS policies and private `study-materials` bucket. Its live migration history differs from the bootstrap SQL; the older bootstrap script is therefore kept under `supabase/reference/` and must not be blindly applied.
- The `public.claim_teacher_access()` function is already applied to the live Supabase project. It permits only the preconfigured, email-confirmed teacher account to claim the teacher role.
- RLS is enabled on all reviewed public content and account tables, plus the private role table. Anonymous users cannot invoke quiz scoring or teacher role claiming, and neither anonymous nor signed-in users can read `private.user_roles` directly.
- The Supabase security advisor currently reports two authenticated-only `SECURITY DEFINER` RPC warnings: `submit_quiz` (needed to read protected answer keys and score on the server) and `claim_teacher_access` (needed to write the private role). Both check the authenticated identity and enforce narrow server-side rules; keep these functions reviewed.
- No teacher account or co¶»§q«^