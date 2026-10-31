<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Validate Resources URL state with the TanStack Zod adapter and normalize supported filters in the page, so invalid links remain safe and optional values type-check.
- Keep unconnected forms and teacher services non-persistent and explicitly unavailable; never simulate a backend success.
- Live practice screens must not import the static question bank; real published questions and secure grading must be integrated before enabling practice.
