# Freelancer navigation and support center

## Navigation
Freelancer links, including system links and logout, share label/body-small font tokens (13px / weight 500), active weight 600, 18px icons with existing 1.8 stroke, 40px hit area, 10px icon gap, shared radius, focus outline and soft blue active state. Group differences are spacing/dividers only. Client navigation retains its existing classes. Existing desktop collapse/mobile drawer behavior is preserved, with accessible link names, aria-current and native title fallbacks for truncated/collapsed labels.

## Support information architecture
Compact header → payment/dispute/safety priority topics → six help topics and real FAQ → inline new request → own tickets → separate formal disputes.
The primary/secondary actions point to the form and own list. Topic selection changes issue choices; subject/description are retained until a successful insert. No user-editable priority selector. Payment blocked/account access derive high; others derive normal.

Issue labels are stored as readable context in the existing description, not an invented subcategory column. Actual project foreign key is used. Project choices come from current user's project memberships, including previous memberships, under existing RLS. Proposal/payment/coalition/user-specific relations are absent.

## Verified live backend (read-only audit)
- support_tickets: category, subject, description, related_project_id, priority, status, created_at, updated_at.
- support_ticket_messages: ticket_id, sender_id, message, created_at.
- help_articles: audience, category, question, answer.
- disputes: project/milestone/counterparty, status and evidence via existing flow.
- user_reports: existing report_target RPC; user report entry in Messages.
- notifications: existing admin reply/status update notifications, no parallel system.
- Ticket/message RLS: own owner reads/inserts; admin reads/updates/replies. Existing no-contact-info message trigger preserved.
No database schema, migration, RLS or storage changes.

## Detail and admin
Ticket detail shows short id/category/current real status, actual dates, project link, request body, user versus support message timeline, message dates, reply/error/loading states. Only existing statuses shown: open/in_progress/waiting_user/resolved/closed. Closed tickets show a new-request link.
No fabricated status history; the timeline contains real creation and messages.
Admin already has requester/category/priority/status and reply/status/audit/notification actions. Existing list now shows category, readable statuses and updated_at. Status updates now write existing updated_at along with status. Assignment does not exist.

## Missing infrastructure
- Ticket attachments/upload relation, storage limits and MIME policy: absent. No fake upload input.
- Separate subcategory and proposal/payment/coalition/user foreign keys: absent.
- Assignee/assignment workflow: absent.
- Persisted status history: absent.
- Backend-enforced category-derived priority: absent; current form derives priority, existing INSERT RLS only verifies ownership.
- Ticket receipt notification: no existing creation hook; receipt is acknowledged with actual successful insert in UI. Existing admin notifications remain.
- Messages do not update the parent ticket timestamp; message dates remain shown independently. List last update is stored ticket updated_at, not an invented latest message timestamp.

## Verification
Module tests cover derived priorities, real relation payloads, category/issue validation, status semantics, failed versus empty reads, actual submit handlers/duplicate prevention, routes, long text, sender attribution, closed/waiting states, navigation aria-current and desktop/mobile collapse.
TypeScript, lint, full regression and production build are run.
Authenticated desktop/mobile browser test was unavailable: CUA kernel exited with Windows sandbox setup refresh error.

## Current Help IA
The landing now contains only the shared compact page header, local FAQ search, six topic navigation cards, at most five FAQ disclosures and links to create a request/my requests. It does not fetch or render the full request form, ticket list, project membership list or formal disputes.
- /freelancers/help/new: existing request form and authenticated submission; category may be selected through ?topic=.
- /freelancers/help/tickets: existing own-ticket query/list and real statuses.
- /freelancers/help/faq: full real FAQ library with local search.
- /freelancers/help/topics/[topic]: relevant existing destination and category-prefilled request link.
- /freelancers/help/disputes: separate dispute list and actual project workroom entry.
- /freelancers/help/safety: real Messages report flow and account-support entry.
Existing ticket/dispute detail routes remain. Closed freelancer tickets now point to /help/new. No backend/RLS/relations or ticket priority semantics changed. Each view fetches only its needed records. Shared Card compact density provides the 3-by-2 desktop/2-column tablet/1-column mobile topic grid; no smaller typography/padding workaround.
Validation: support module 20/20; full regression 212/212; TypeScript/build PASS; lint 0 errors, 43 existing warnings. Actual authenticated browser viewport inspection remains unavailable due to the previously observed CUA Windows sandbox startup failure.
