# Physics Simplified project rules

- Use the GitHub repository as the source of truth; do not make edits in Lovable.
- Do not commit `.env.local`, Supabase secrets, service-role keys, passwords, or private teacher credentials.
- The browser may use only the Supabase publishable key. All authorization must be enforced by database RLS and server-side RPCs.
- Never let a public sign-up form assign teacher/admin roles. Teacher access may only be granted by a trusted administrator or a security-reviewed database function that checks the authenticated, email-confirmed identity against the fixed teacher allowlist. Never accept a client-supplied email or role as proof of authorization.
- Keep empty states honest. Do not seed sample notes, fake videos, sample quizzes, fabricated metrics, or simulated success messages.
- Publish only content the teacher owns or is authorised to share.
- Supported classes are 7–12; supported subjects are Physics, Chemistry, Biology, General Science, and Mathematics.
- Do not deploy to production without the user's explicit approval.
