# Freelancer AI work center

The /freelancers/ai page is a controlled tool center. Free-form messages, conversation state, context composer and the POST chat boundary are removed. The passive chat roadmap teaser has no interaction.

## Calls and sources
- Initial GET /api/ai/freelancer-workspace only reads open project titles, the current freelancer's proposal count and profile completion through the authenticated Supabase client. No model or matching call occurs.
- Matching is an explicit GET with tool=matching (Plus) or tool=advanced-matching (Pro). The server rechecks the central entitlement source, applies 10 requests per 10 minutes and uses the existing workspace and semantic matching cache.
- Profile, proposal performance and Pro insights explicitly use the existing /api/premium/performance. Profile insights are deterministic analytics, not generated chat.
- Project evaluation explicitly POSTs only projectId to the existing /api/ai/match-talent, with its existing auth and rate limit.
- Proposal assistant opens the selected project's existing detail/role/proposal flow. No draft is generated on navigation by this center; the existing proposal assistant requires a user click.
- Smart Project Alerts explicitly uses /api/premium/recommended-projects.
- Successful results are reused for five minutes in this mounted page, keyed by endpoint and project. No localStorage, cross-session chat or durable parallel cache. Remount/retry resets the cache. Existing server semantic cache remains unchanged.
- Failed requests do not become briefing data. No invented AI answers, counts or reviewer/profile metadata.

## Access and presentation
Main grid: four core tools. Two extra Plus tools are compact rows; three Pro tools are a separate compact group. Required plan badges derive from FEATURE_MATRIX; allowed flags derive from canUseFeature with the server's AccessContext. All privileged endpoints retain their server checks. No RLS, schema or provider payload changes.

AI Briefing uses the exact own-record count/completion initially and results from explicitly completed analyses thereafter. Unrun analyses show an instruction, not an invented opportunity count. Profile coaching uses existing profile analysis suggestions; proposal insight uses actual sent/responded/accepted totals. Smart alert counts represent the returned recommendation set.
