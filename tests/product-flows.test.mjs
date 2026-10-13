import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function compile(source, context = {}) {
  const result = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { module: result, exports: result.exports, ...context });
  return result.exports;
}

function extract(path, predicate) {
  const source = fs.readFileSync(path, "utf8");
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (!found && predicate(node)) found = node;
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.ok(found, "Expected source node in " + path);
  return found.getText(file);
}

const messaging = compile(fs.readFileSync("lib/messaging/conversations.ts", "utf8"));

test("attachment-only messages have a filename preview and searchable text", () => {
  const message = { content: null, attachment_name: "İŞ PLANI.pdf", attachment_url: "files/plan" };
  assert.equal(messaging.messagePreview(message), "İŞ PLANI.pdf");
  assert.ok(messaging.messageSearchText(message).includes("iş planı"));
});

test("text and attachment filename are both searchable", () => {
  const message = { content: "İlk teslim", attachment_name: "TASARIM.pdf" };
  assert.equal(messaging.messagePreview(message), "İlk teslim");
  assert.ok(messaging.messageSearchText(message).includes("tasarım"));
  assert.ok(messaging.messageSearchText(message).includes("ilk teslim"));
});

test("old attachments and new empty conversations have useful previews", () => {
  assert.equal(messaging.messagePreview({ content: null, attachment_url: "file" }), "Dosya eki");
  assert.equal(messaging.messagePreview({ content: null }), "Yeni konuşma");
  assert.equal(messaging.messageSearchText({ content: null }), "");
});

for (const role of ["client", "freelancers"]) {
  test(role + " conversations keep general and project messages separate", () => {
    const declaration = extract("app/" + role + "/messages/page.tsx", node =>
      ts.isVariableDeclaration(node) && node.name.getText() === "selectedMessages");
    const messages = [
      { id: "general", sender_id: "me", receiver_id: "other", proposal_id: null },
      { id: "a", sender_id: "other", receiver_id: "me", proposal_id: "proposal-a" },
      { id: "b", sender_id: "me", receiver_id: "other", proposal_id: "proposal-b" },
      { id: "unrelated", sender_id: "stranger", receiver_id: "me", proposal_id: null },
    ];
    function selected(proposal) {
      return compile("const " + declaration + "; module.exports = selectedMessages;", {
        messages, currentUserId: "me", selectedUserId: "other", selectedProposalId: proposal, selectedProjectId: null,
      });
    }
    assert.equal(selected(null).map(m => m.id).join(","), "general");
    assert.equal(selected("proposal-a").map(m => m.id).join(","), "a");
    assert.equal(selected("proposal-b").map(m => m.id).join(","), "b");
  });
}

function fakeSupabase(fixtures) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "me" } }, error: null }) },
    rpc: () => Promise.resolve({ data: [{ first_name: "Test" }], error: null }),
    from(table) {
      let rows = fixtures[table] || [];
      let count = false;
      const query = {
        select(_columns, options) { count = Boolean(options?.count); return query; },
        eq(column, value) { rows = rows.filter(row => row[column] === value); return query; },
        in(column, values) { rows = rows.filter(row => values.includes(row[column])); return query; },
        is(column, value) { rows = rows.filter(row => row[column] === value); return query; },
        order() { return query; },
        limit(n) { rows = rows.slice(0, n); return query; },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: fixtures.__errors?.[table] ?? null, count: count ? rows.length : null }).then(resolve, reject); },
      };
      return query;
    },
  };
}

const deadlineHelpers = compile(fs.readFileSync("lib/utils/deadline.ts", "utf8"));
const workflowHelpers = compile(fs.readFileSync("lib/projects/workflow-state.ts", "utf8"));
const dashboardHelpers = compile(fs.readFileSync("lib/projects/dashboard.ts", "utf8"), {
  require: path => path.includes("workflow-state") ? workflowHelpers : deadlineHelpers,
});
const teamHelpers = compile(fs.readFileSync("lib/projects/teamReadiness.ts", "utf8"));
async function loadDashboard(role, fixtures, expectError = false) {
  const fn = extract("app/" + role + "/dashboard/page.tsx", node =>
    ts.isFunctionDeclaration(node) && node.name?.text === "loadDashboard");
  let data;
  let error;
  const load = compile(fn + "; module.exports = loadDashboard;", {
    supabase: fakeSupabase(fixtures), active: true,
    setData: value => { data = value; }, setLoading() {}, setError: value => { error = value; },
    fetchBudgetBreakdown: async () => [],
    projectWork: dashboardHelpers.projectWork, knownAmount: dashboardHelpers.knownAmount,
    getTeamCompletion: teamHelpers.getTeamCompletion, IMPORTANT_EVENTS: ["proposal_received", "milestone_revision_submitted"],
  });
  await load();
  if (expectError) {
    assert.ok(error);
    assert.equal(data, undefined);
    return { error };
  }
  assert.ok(!error, error);
  assert.ok(data);
  return data;
}

test("client dashboard retains a project when its team becomes ready", async () => {
  const data = await loadDashboard("client", {
    projects: [
      { id: "open", client_id: "me", status: "open" },
      { id: "ready", client_id: "me", status: "ready_to_start" },
      { id: "active", client_id: "me", status: "in_progress" },
    ],
  });
  assert.equal(data.projectCount, 3);
  assert.equal(data.readyProjects.map(p => p.id).join(","), "ready");
  assert.equal(data.openProjects.map(p => p.id).join(","), "open");
  assert.equal(data.activeProjects.map(p => p.id).join(","), "active");
});

test("freelancer dashboard shows invitation memberships before project start", async () => {
  const data = await loadDashboard("freelancers", {
    projects: [{ id: "ready", status: "ready_to_start" }, { id: "recruiting", status: "open" }],
    project_team_members: [
      { project_id: "ready", freelancer_id: "me", status: "active", role: "Designer" },
      { project_id: "recruiting", freelancer_id: "me", status: "active", role: "Developer" },
    ],
    project_team_invitations: [
      { freelancer_id: "me", status: "pending" },
      { freelancer_id: "me", status: "accepted" },
      { freelancer_id: "other", status: "pending" },
    ],
  });
  assert.equal(data.activeProjects.length, 0);
  assert.equal(data.waitingProjects.length, 2);
  assert.equal(data.pendingInvitations, 1);
});

test("freelancer current milestone belongs to their own work", async () => {
  const data = await loadDashboard("freelancers", {
    projects: [{ id: "active", status: "in_progress", team_required: true }],
    project_team_members: [{ project_id: "active", freelancer_id: "me", status: "active" }],
    project_milestones: [
      { id: "other", project_id: "active", freelancer_id: "other", status: "active" },
      { id: "own", project_id: "active", freelancer_id: "me", status: "active" },
    ],
  });
  assert.equal(data.activeProjects[0].currentMilestone.id, "own");
});

test("failed client project request shows an error instead of no projects", async () => {
  await loadDashboard("client", { __errors: { projects: { message: "offline" } } }, true);
});

test("failed freelancer membership request does not hide active work", async () => {
  await loadDashboard("freelancers", { __errors: { project_team_members: { message: "offline" } } }, true);
});

test("invitation link opens received tab and preserves it after success cleanup", () => {
  const effect = extract("app/freelancers/proposals/page.tsx", node =>
    ts.isCallExpression(node) && node.expression.getText() === "useEffect" && node.getText().includes('params.get("tab")'));
  let selectedTab;
  let success;
  let cleanedUrl;
  compile(effect + ";", {
    useEffect: callback => callback(), URLSearchParams,
    setActiveTab: value => { selectedTab = value; },
    setJustSubmitted: value => { success = value; },
    window: {
      location: { search: "?tab=received&submitted=1", pathname: "/freelancers/proposals" },
      history: { replaceState: (_state, _title, url) => { cleanedUrl = url; } },
    },
  });
  assert.equal(selectedTab, "received");
  assert.equal(success, true);
  assert.equal(cleanedUrl, "/freelancers/proposals?tab=received");
});

test("shortlisted proposals still count as awaiting client decision", async () => {
  const data = await loadDashboard("freelancers", {
    proposals: [
      { id: "a", project_id: "p", freelancer_id: "me", status: "pending" },
      { id: "b", project_id: "p", freelancer_id: "me", status: "shortlisted" },
      { id: "c", project_id: "p", freelancer_id: "me", status: "accepted" },
    ],
    projects: [{ id: "p", status: "open" }],
  });
  assert.equal(data.pendingProposals, 2);
});

const workflow = compile(fs.readFileSync("lib/projects/workflow-state.ts", "utf8"));

const workflowInput = (overrides = {}) => ({
  projectStatus: "in_progress",
  viewerRole: "client",
  isTeamProject: false,
  milestones: [{ id: "m1", title: "İlk teslim", status: "active", freelancer_id: "freelancer-1" }],
  currentUserId: "client-1",
  teamMemberIds: ["freelancer-1"],
  ...overrides,
});

test("ready project requires the client to start while freelancer waits", () => {
  const client = workflow.resolveProjectWorkflowState(workflowInput({ projectStatus: "ready_to_start" }));
  const freelancer = workflow.resolveProjectWorkflowState(workflowInput({ projectStatus: "ready_to_start", viewerRole: "freelancer" }));
  assert.equal(client.actionOwner, "Client");
  assert.equal(client.currentUserMustAct, true);
  assert.equal(freelancer.currentUserMustAct, false);
  assert.match(freelancer.nextStep, /Client projeyi başlatınca/);
});

test("an incomplete team cannot appear ready for completion when a member has no milestone", () => {
  const state = workflow.resolveProjectWorkflowState(workflowInput({
    isTeamProject: true,
    milestones: [{ id: "m1", title: "Frontend", status: "approved", freelancer_id: "freelancer-1" }],
    teamMemberIds: ["freelancer-1", "freelancer-2"],
  }));
  assert.notEqual(state.state, "Tüm aşamalar onaylandı");
  assert.equal(state.currentUserMustAct, false);
});

test("submitted work asks the client to review or request revision", () => {
  const state = workflow.resolveProjectWorkflowState(workflowInput({
    milestones: [{ id: "m1", title: "Tasarım", status: "submitted", freelancer_id: "freelancer-1" }],
  }));
  assert.equal(state.actionOwner, "Client");
  assert.equal(state.currentUserMustAct, true);
  assert.match(state.nextStep, /onayla veya revizyon iste/);
});

test("revision action belongs to the owning freelancer", () => {
  const state = workflow.resolveProjectWorkflowState(workflowInput({
    viewerRole: "freelancer",
    isTeamProject: true,
    currentUserId: "freelancer-1",
    milestones: [{ id: "m1", title: "API", status: "revision", freelancer_id: "freelancer-1" }],
  }));
  assert.equal(state.actionOwner, "Freelancer");
  assert.equal(state.currentUserMustAct, true);
  assert.match(state.nextStep, /revizyonunu yeniden teslim et/);
});

test("team freelancer ignores another member's active milestone", () => {
  const state = workflow.resolveProjectWorkflowState(workflowInput({
    viewerRole: "freelancer",
    isTeamProject: true,
    currentUserId: "freelancer-1",
    teamMemberIds: ["freelancer-1", "freelancer-2"],
    milestones: [{ id: "m2", title: "Backend", status: "active", freelancer_id: "freelancer-2" }],
  }));
  assert.equal(state.currentUserMustAct, false);
  assert.equal(state.actionOwner, "Client / Ekip");
});

test("all-approved project asks only the client to complete it", () => {
  const milestones = [{ id: "m1", title: "Tasarım", status: "approved", freelancer_id: "freelancer-1" }];
  const client = workflow.resolveProjectWorkflowState(workflowInput({ milestones }));
  const freelancer = workflow.resolveProjectWorkflowState(workflowInput({ milestones, viewerRole: "freelancer" }));
  assert.equal(client.state, "Tüm aşamalar onaylandı");
  assert.equal(client.currentUserMustAct, true);
  assert.equal(freelancer.currentUserMustAct, false);
});

test("empty stage responsibility is clear for single and team projects", () => {
  const singleClient = workflow.resolveProjectWorkflowState(workflowInput({ milestones: [] }));
  const teamFreelancer = workflow.resolveProjectWorkflowState(workflowInput({
    milestones: [], isTeamProject: true, viewerRole: "freelancer",
  }));
  assert.equal(singleClient.currentUserMustAct, true);
  assert.equal(teamFreelancer.currentUserMustAct, true);
  assert.equal(teamFreelancer.actionOwner, "Freelancer");
});

test("terminal and unknown states do not offer actions", () => {
  for (const projectStatus of ["completed", "cancelled", "unknown"]) {
    const state = workflow.resolveProjectWorkflowState(workflowInput({ projectStatus }));
    assert.equal(state.currentUserMustAct, false);
  }
});

test("project readiness and completion guards are enforced by the database migration", () => {
  const sql = fs.readFileSync("supabase/migrations/20261009132040_project_readiness_status_guards.sql", "utf8");
  assert.match(sql, /old\.status <> 'open'/);
  assert.match(sql, /new\.status in \('ready_to_start', 'in_progress'\)/);
  assert.match(sql, /v_filled <> v_capacity/);
  assert.match(sql, /old\.status <> 'ready_to_start'/);
  assert.match(sql, /Her aktif ekip üyesinin en az bir onaylı aşaması/);
  assert.match(sql, /project_team_members_reopen_if_incomplete/);
  assert.match(sql, /Devam eden projede ekip üyeliği değiştirilemez/);
  assert.match(sql, /for update of p/);
});

test("freelancer earnings detail reads the review received from the client", () => {
  const source = fs.readFileSync("app/freelancers/earnings/[projectId]/page.tsx", "utf8");
  assert.match(source, /\.eq\("reviewee_id", user\.id\)/);
  assert.match(source, /\.eq\("reviewer_role", "client"\)/);
  assert.doesNotMatch(source, /\.eq\("reviewer_id", user\.id\)/);
});



const deadlines = compile(fs.readFileSync("lib/utils/deadline.ts", "utf8"));

test("overdue stage classification is derived from the due date and active state", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dueDate = yesterday.toISOString();
  assert.equal(deadlines.getDeadlineStatus({ dueDate, status: "active" }), "overdue");
  assert.equal(deadlines.getDeadlineStatus({ dueDate, status: "revision" }), "overdue");
  assert.equal(deadlines.getDeadlineStatus({ dueDate, status: "pending" }), null);
  assert.equal(deadlines.getDeadlineStatus({ dueDate, status: "approved" }), null);
});

test("revision request and resubmission notifications use distinct idempotency keys", async () => {
  const source = fs.readFileSync("lib/notifications.ts", "utf8");
  const notifyUsersDeclaration = extract("lib/notifications.ts", node => ts.isFunctionDeclaration(node) && node.name?.text === "notifyUsers");
  const revisionRequested = extract("lib/notifications.ts", node => ts.isFunctionDeclaration(node) && node.name?.text === "notifyRevisionRequested");
  const revisionSubmitted = extract("lib/notifications.ts", node => ts.isFunctionDeclaration(node) && node.name?.text === "notifyRevisionDeliverySubmitted");
  assert.ok(source.includes("milestone_revision_submitted"));
  const fns = compile(
    "const CLIENT_PROJECT_LINK = id => '/client/projects/' + id;" +
    "const FREELANCER_PROJECT_LINK = id => '/freelancers/projects/' + id;" +
    notifyUsersDeclaration + revisionRequested + revisionSubmitted +
    "; module.exports = { notifyRevisionRequested, notifyRevisionDeliverySubmitted };",
    { dispatchNotificationEmail: async () => {} }
  );
  const payloads = [];
  const supabase = { rpc: async (_name, args) => { payloads.push(args.p_notifications); return { error: null }; } };
  await fns.notifyRevisionRequested(supabase, {
    freelancerIds: ["freelancer-1"], projectId: "p1", milestoneId: "m1", milestoneTitle: "Tasarım", revisionNo: 2,
  });
  await fns.notifyRevisionDeliverySubmitted(supabase, {
    clientId: "client-1", projectId: "p1", milestoneId: "m1", milestoneTitle: "Tasarım", attemptNo: 3,
  });
  assert.equal(payloads[0][0].type, "milestone_revision");
  assert.equal(payloads[0][0].dedupeKey, "milestone_revision:m1:2:freelancer-1");
  assert.equal(payloads[1][0].type, "milestone_revision_submitted");
  assert.equal(payloads[1][0].dedupeKey, "milestone_revision_submitted:m1:3");
});

test("deadline notifications are page-triggered rather than scheduled in the database", () => {
  const source = fs.readFileSync("components/projects/ProjectWorkroom.tsx", "utf8");
  const migration = fs.readFileSync("supabase/migrations/202609300002_marketplace_operations.sql", "utf8");
  assert.match(source, /rpc\("sync_deadline_notifications"/);
  assert.doesNotMatch(migration, /cron\.schedule|pg_cron/);
});

test("placement acceptance serializes on the project and consumes only pending offers", () => {
  const sql = fs.readFileSync("supabase/migrations/202609200001_team_placement_capacity_rpc.sql", "utf8");
  assert.match(sql, /for update of i/);
  assert.match(sql, /for update of p/);
  assert.match(sql, /for update\s*;/);
  assert.match(sql, /v_status not in \('open', 'ready_to_start'\)/);
  assert.match(sql, /v_current_count >= v_capacity/);
  assert.match(sql, /already_member/);
});

test("proposal state machine keeps withdrawn and rejected offers terminal", () => {
  const sql = fs.readFileSync("supabase/migrations/202609300001_marketplace_security_hardening.sql", "utf8");
  assert.match(sql, /status in \('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'expired'\)/);
  assert.match(sql, /old\.status = 'pending' and new\.status in/);
  assert.match(sql, /old\.status = 'shortlisted' and new\.status in/);
});

test("milestone writes are scoped to the current project member and valid predecessor state", () => {
  const sql = fs.readFileSync("supabase/migrations/202609300001_marketplace_security_hardening.sql", "utf8");
  assert.match(sql, /new\.freelancer_id <> auth\.uid\(\)/);
  assert.match(sql, /old\.status = 'active' and new\.status <> 'submitted'/);
  assert.match(sql, /old\.status = 'revision' and new\.status <> 'in_review'/);
  assert.match(sql, /old\.status not in \('active', 'revision'\)/);
});

test("client and freelancer detail pages scope project access to owner or active membership", () => {
  const client = fs.readFileSync("app/client/projects/[id]/page.tsx", "utf8");
  const freelancer = fs.readFileSync("app/freelancers/projects/[id]/page.tsx", "utf8");
  assert.match(client, /\.eq\("client_id", user\.id\)/);
  assert.match(freelancer, /\.eq\("freelancer_id", user\.id\)/);
  assert.match(freelancer, /\.eq\("status", "active"\)/);
});

test("start action treats a lost compare-and-set as stale state, not success", () => {
  const source = fs.readFileSync("app/client/projects/[id]/page.tsx", "utf8");
  assert.match(source, /\.eq\("status", "ready_to_start"\)[\s\S]*?\.select\("id"\)[\s\S]*?\.maybeSingle\(\)/);
  assert.match(source, /if \(!startedProject\)[\s\S]*?await loadProject\(\)/);
});

test("completion action refreshes the project before accepting an empty compare-and-set", () => {
  const source = fs.readFileSync("components/projects/ProjectWorkroom.tsx", "utf8");
  assert.match(source, /if \(!completedRow\)[\s\S]*?select\("status"\)[\s\S]*?currentProject\?\.status === "completed"/);
});
test("readiness helper verifies the persisted row after a concurrent state change", () => {
  const source = fs.readFileSync("lib/projects/teamReadiness.ts", "utf8");
  assert.match(source, /\.eq\("status", "open"\)[\s\S]*?\.select\("id"\)[\s\S]*?\.maybeSingle\(\)/);
  assert.match(source, /if \(!readyProject\)[\s\S]*?latestProject\?\.status === "ready_to_start"/);
});




const panelRoles = compile(fs.readFileSync("lib/auth/roles.ts", "utf8"));

test("client reaches client panel and is redirected away from freelancer panel", () => {
  const session = { authenticated: true, emailConfirmed: true, role: "client" };
  assert.equal(panelRoles.resolvePanelAccess("/client/dashboard", session), null);
  assert.equal(panelRoles.resolvePanelAccess("/freelancers/dashboard", session), "/client/dashboard");
});

test("freelancer reaches freelancer panel and is redirected away from client panel", () => {
  const session = { authenticated: true, emailConfirmed: true, role: "freelancer" };
  assert.equal(panelRoles.resolvePanelAccess("/freelancers/dashboard", session), null);
  assert.equal(panelRoles.resolvePanelAccess("/client/dashboard", session), "/freelancers/dashboard");
});

test("unauthenticated protected panel requests go to login", () => {
  assert.equal(panelRoles.resolvePanelAccess("/client/dashboard", {
    authenticated: false, emailConfirmed: false, role: null,
  }), "/login");
});

test("unconfirmed users retain verification redirect before role routing", () => {
  assert.equal(panelRoles.resolvePanelAccess("/freelancers/dashboard", {
    authenticated: true, emailConfirmed: false, role: "client",
  }), "/auth/verify-email");
});

test("public freelancer profiles are not classified as protected panels", () => {
  assert.equal(panelRoles.isProtectedPanelPath("/freelancers/ahmet-demir"), false);
  assert.equal(panelRoles.resolvePanelAccess("/freelancers/ahmet-demir", {
    authenticated: true, emailConfirmed: true, role: "client",
  }), null);
});

test("canonical role normalization ignores user metadata and unknown roles", () => {
  assert.equal(panelRoles.normalizeSessionRole("client"), "client");
  assert.equal(panelRoles.normalizeSessionRole("freelancer"), "freelancer");
  assert.equal(panelRoles.normalizeSessionRole("admin"), null);
});

test("client direct message writes go through the authenticated server endpoint", () => {
  const clientMessages = fs.readFileSync("app/client/messages/page.tsx", "utf8");
  assert.match(clientMessages, /fetch\("\/api\/messages\/send"/);
  assert.doesNotMatch(clientMessages, /from\("messages"\)\s*\.insert\(/);
  assert.match(clientMessages, /receiverId: selectedUserId/);
  assert.doesNotMatch(clientMessages, /sender_id:\s*currentUserId/);
});

test("shared message endpoint derives sender from auth and validates pair/project/proposal/coalition", () => {
  const route = fs.readFileSync("app/api/messages/send/route.ts", "utf8");
  assert.match(route, /const senderId = context\.userId/);
  assert.doesNotMatch(route, /senderId\?:|body\.senderId/);
  assert.match(route, /proposal\.freelancer_id === senderId/);
  assert.match(route, /project\?\.client_id === receiverId/);
  assert.match(route, /coalition_members/);
  assert.match(route, /project_team_invitations/);
  assert.match(route, /containsContactInfo\(content\)/);
  assert.match(route, /attachmentUrl\.startsWith\(`\$\{senderId\}\//);
});

test("coalition broadcasts use the same endpoint without accepting a sender id", () => {
  const source = fs.readFileSync("lib/coalitions/teamMessages.ts", "utf8");
  assert.match(source, /fetch\("\/api\/messages\/send"/);
  assert.match(source, /JSON\.stringify\(\{ coalitionId, content: trimmed \}\)/);
  assert.doesNotMatch(source, /sender_id:\s*senderId/);
});

test("client direct conversation query and realtime ignore coalition broadcasts", () => {
  const source = fs.readFileSync("app/client/messages/page.tsx", "utf8");
  assert.match(source, /\.not\("receiver_id", "is", null\)/);
  assert.match(source, /newMessage\.receiver_id === null \|\| newMessage\.coalition_id/);
});

test("message scope preserves project context while legacy rows remain unlinked", () => {
  const migration = fs.readFileSync("supabase/migrations/20261009112352_role_project_message_isolation.sql", "utf8");
  const route = fs.readFileSync("app/api/messages/pre-proposal/route.ts", "utf8");
  assert.match(migration, /add column if not exists project_id uuid references public\.projects\(id\) on delete set null/);
  assert.match(route, /project_id: projectId/);
  assert.doesNotMatch(migration, /update public\.messages[\s\S]*?set project_id/);
});

test("project visibility helper adds active team members without broadening private projects", () => {
  const migration = fs.readFileSync("supabase/migrations/20261009112352_role_project_message_isolation.sql", "utf8");
  assert.match(migration, /p\.client_id = auth\.uid\(\)/);
  assert.match(migration, /p\.status = 'open'/);
  assert.match(migration, /pr\.freelancer_id = auth\.uid\(\)/);
  assert.match(migration, /tm\.freelancer_id = auth\.uid\(\)[\s\S]*?tm\.status = 'active'/);
  assert.match(migration, /private\.can_view_project\(id\)/);
  assert.match(migration, /revoke all on function private\.can_view_project\(uuid\) from public, anon/i);
});

test("message INSERT RLS rejects arbitrary direct writes and preserves coalition policy", () => {
  const migration = fs.readFileSync("supabase/migrations/20261009112352_role_project_message_isolation.sql", "utf8");
  assert.match(migration, /sender_id = auth\.uid\(\)[\s\S]*?receiver_id is not null[\s\S]*?coalition_id is null[\s\S]*?private\.can_send_direct_message\(receiver_id, proposal_id, project_id\)/);
  assert.doesNotMatch(migration, /not exists\s*\(\s*select 1 from public\.profiles[\s\S]*?role <> 'freelancer'/i);
  assert.match(migration, /on public\.messages for insert to authenticated/i);
});

test("dashboard role checks share canonical profiles.role helper", () => {
  const session = fs.readFileSync("lib/auth/session.ts", "utf8");
  const proxy = fs.readFileSync("proxy.ts", "utf8");
  const client = fs.readFileSync("app/client/layout.tsx", "utf8");
  const freelancer = fs.readFileSync("app/freelancers/dashboard/layout.tsx", "utf8");
  assert.match(session, /\.from\("profiles"\)[\s\S]*?\.select\("role"\)/);
  assert.match(proxy, /\.from\("profiles"\)[\s\S]*?\.select\("role"\)/);
  assert.match(client, /requireSession\("client"\)/);
  assert.match(freelancer, /requireSession\("freelancer"\)/);
});


test("team dashboard excludes unassigned and another member's stages from personal progress", () => {
  const work = dashboardHelpers.projectWork({
    status: "in_progress", teamRequired: true, viewer: "freelancer", userId: "me", memberIds: ["me", "other"],
    milestones: [
      { id: "unassigned", project_id: "p", title: "Not assigned", freelancer_id: null, status: "active", due_date: "2020-01-01", sort_order: 0 },
      { id: "other", project_id: "p", title: "Other", freelancer_id: "other", status: "approved", due_date: null, sort_order: 1 },
      { id: "own", project_id: "p", title: "Own", freelancer_id: "me", status: "submitted", due_date: null, sort_order: 2 },
    ],
  });
  assert.equal(work.currentMilestone.id, "own");
  assert.equal(work.totalMilestones, 1);
  assert.equal(work.approvedMilestones, 0);
  assert.equal(work.overdueMilestones.length, 0);
  assert.equal(work.workflow.currentUserMustAct, false);
});

test("client dashboard reviews resubmissions before active work", () => {
  const work = dashboardHelpers.projectWork({
    status: "in_progress", teamRequired: true, viewer: "client", userId: "me", memberIds: ["f"],
    milestones: [
      { id: "active", title: "Build", freelancer_id: "f", status: "active", sort_order: 0 },
      { id: "review", title: "Resubmission", freelancer_id: "f", status: "submitted", sort_order: 1 },
    ],
  });
  assert.equal(work.currentMilestone.id, "review");
  assert.equal(work.workflow.currentUserMustAct, true);
});

test("freelancer amount comes from invitation agreement, never the client budget", async () => {
  const data = await loadDashboard("freelancers", {
    projects: [{ id: "p", status: "in_progress", team_required: true, budget: 115000 }],
    project_team_members: [{ project_id: "p", freelancer_id: "me", status: "active", agreed_amount: 42000 }],
    project_milestones: [
      { id: "mine", project_id: "p", freelancer_id: "me", status: "approved", budget: 12000 },
      { id: "theirs", project_id: "p", freelancer_id: "other", status: "approved", budget: 73000 },
    ],
  });
  assert.equal(data.activeProjects[0].amount, 42000);
  assert.equal(data.earnings.approved, 12000);
  assert.equal(data.earnings.remaining, 30000);
});

test("missing agreement is reported instead of fabricated zero earnings", async () => {
  const data = await loadDashboard("freelancers", {
    projects: [{ id: "p", status: "in_progress", budget: 115000 }],
    project_team_members: [{ project_id: "p", freelancer_id: "me", status: "active" }],
  });
  assert.equal(data.activeProjects[0].amount, null);
  assert.equal(data.earnings.missingAmounts, true);
});

test("client action proposals exclude terminal offers and query failures remain visible", async () => {
  const fixtures = {
    projects: [{ id: "p", client_id: "me", status: "open" }],
    proposals: [
      { project_id: "p", status: "pending" }, { project_id: "p", status: "shortlisted" },
      { project_id: "p", status: "accepted" }, { project_id: "p", status: "withdrawn" },
    ],
  };
  const data = await loadDashboard("client", fixtures);
  assert.equal(data.openProjects[0].proposalCount, 2);
  await loadDashboard("client", { ...fixtures, __errors: { project_milestones: { message: "offline" } } }, true);
});

test("client project cost uses actual agreements and frozen service fee", async () => {
  const data = await loadDashboard("client", {
    projects: [{ id: "p", client_id: "me", status: "in_progress", budget_max: 999999, commission_rate: 0.12 }],
    project_team_members: [
      { project_id: "p", status: "active", freelancer_id: "a", agreed_amount: 40000 },
      { project_id: "p", status: "active", freelancer_id: "b", agreed_amount: 60000 },
    ],
  });
  assert.equal(data.activeProjects[0].cost, 112000);
});


test("monthly work value uses real approval dates and only the freelancer's stages", async () => {
  const now = new Date().toISOString();
  const data = await loadDashboard("freelancers", {
    projects: [{ id: "p", status: "in_progress", team_required: true }],
    project_team_members: [{ project_id: "p", freelancer_id: "me", status: "active", agreed_amount: 42000 }],
    project_milestones: [
      { id: "current", project_id: "p", freelancer_id: "me", status: "approved", budget: 12000, approved_at: now },
      { id: "old", project_id: "p", freelancer_id: "me", status: "approved", budget: 5000, approved_at: "2020-01-01" },
      { id: "other", project_id: "p", freelancer_id: "other", status: "approved", budget: 73000, approved_at: now },
      { id: "unassigned", project_id: "p", freelancer_id: null, status: "approved", budget: 9000, approved_at: now },
    ],
  });
  assert.equal(data.earnings.monthly, 12000);
});
