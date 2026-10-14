# Freelancer shell consistency pass

## Scope and evidence
All 31 page routes under app/freelancers were discovered and inspected in source, including redirect, primary modules, detail/create views, public profile and every Help route. This is a source/layout audit, not a completed authenticated visual acceptance test.

Primary modules: Dashboard, Discover, Projects, Proposals/Invitations, Saved, Coalitions, Freelancer Directory, Earnings, AI, Messages, Notifications, Profile, Settings, Help and Performance. Additional routes: coalition create/detail, project workroom, discovery project detail, proposal detail, earnings project detail, public username profile, and Help FAQ/new/tickets/ticket detail/topics/safety/disputes/dispute detail. /freelancers redirects to Dashboard.

## Shared primitives
- app/freelancers/layout.tsx now owns a single 100dvh frame, shared navbar and content column.
- FreelancerShell.module.css defines the frame/column/main scroll geometry. Navbar height/search/actions remain unchanged.
- FreelancerViewport.tsx owns main content scrolling, resets only that viewport on pathname change, preserves query-only workspace navigation, and prevents background scrolling while the mobile drawer is open.
- PageContainer retains existing app-wide width/padding and Client behavior.
- PageHeader.tsx exports an opt-in canonical header class from PageHeader.module.css. Existing Client PageHeader defaults are unchanged.
- Freelancer primary local header classes compose the canonical class: 24px/30px title, weight 600; 13px/20px subtitle; existing title gap and 32px header rhythm. Old 28px/700 title and header-height overrides removed.
- Sidebar.tsx and Sidebar.module.css keep header, flexible min-height:0 scrolling nav, and shrink:0 footer as siblings. Freelancer-only 100dvh constraint prevents sidebar growth with main content. The nav retains overflow-y:auto, native wheel/touch scrolling, keyboard tab focus and hides scrollbar track with scrollbar-width:none plus WebKit fallback.

## Local overrides removed
Main-page p-6/p-5/md:p-8 and centering/max-width wrappers removed where shell spacing was duplicated in Messages, Notifications, Settings, Performance, Profile edit, proposal detail, coalition creation, earnings detail and project/discovery workrooms/loading/error surfaces. Earnings and AI root padding removed; Dashboard root offset and separate max-width removed. Filters, cards, dialog padding, internal content grids and business functionality remain.

Equivalent module headers use the canonical hierarchy; redundant primary-module eyebrows were removed. Dashboard artwork moved to the action side so it no longer offsets the title. Tekliflerin -> Tekliflerim and Koalisyonların -> Koalisyonlarım apply to own-content headings/back/menu; contextual second-person explanatory sentences stay intact.

Intentional compositions remain: profile identity/header, workroom project context, AI and Discover content heroes, detail breadcrumbs, financial summaries, proposal tabs and Messages internal workspace. AI/Discover heroes are content h2s beneath canonical module headings. Messages has a flex workspace derived from shell dimensions, so title wrapping reduces available workspace height without a magic 220px subtraction.

## Regression and remaining acceptance
Source/markup tests verify all 14 real nav links exist in the nav before the footer, active/accessible names and collapsed layout, and main-only route scroll reset. Full suite: 214 tests PASS. TypeScript/build PASS; lint 0 errors, 43 existing warnings. No backend, database, RLS, data-fetching helpers or workflow logic changed.

Authenticated wide/standard/short-height desktop, tablet and mobile visual comparison remains pending. CUA startup failed with the same Windows sandbox kernel error; therefore no measured footer overlap, scroll reachability or Client visual regression claim is made. The structural/code fix is implemented, but visual acceptance is not marked complete.
