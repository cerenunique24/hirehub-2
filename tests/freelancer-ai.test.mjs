import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function compile(path, require = () => ({}), globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, module: { exports }, require, Date, URL, AbortController, console, ...globals });
  return exports;
}
const premium = compile("lib/premium.ts");
const contracts = compile("lib/ai/assistantContracts.ts", () => premium);
const options = compile("lib/ai/assistantOptions.ts", name => name.includes("assistantContracts") ? contracts : premium);
const access = plan => ({ userId: "me", role: "freelancer", plan, subscription: { plan } });
function db({ failure = false, empty = false } = {}) {
  const calls = [];
  const rows = {
    projects: [{ id: "p", title: "Gerçek proje", status: "open" }, { id: "closed", title: "Kapalı", status: "completed" }],
    proposals: empty ? [] : [{ id: "mine", freelancer_id: "me" }, { id: "other", freelancer_id: "someone" }],
    profiles: [{ id: "me", profile_completion: empty ? null : 80 }],
  };
  return { calls, from(table) {
    let data = rows[table] ?? [], single = false;
    const query = {
      select(columns) { calls.push({ table, columns }); return query; },
      eq(key, value) { calls.push({ table, key, value }); data = data.filter(row => row[key] === value); return query; },
      in(key, values) { data = data.filter(row => values.includes(row[key])); return query; },
      order() { return query; }, limit(count) { data = data.slice(0, count); return query; },
      single() { single = true; return query; },
      then(resolve, reject) { return Promise.resolve({ data: single ? data[0] : data, count: data.length, error: failure ? { message: "Unavailable" } : null }).then(resolve, reject); },
    };
    return query;
  } };
}
const matching = { plan: "plus", summary: { suitableProjects: 1, strongMatches: 1, insights: 1 }, recommendations: [{ projectId: "p", title: "Gerçek proje", roleId: "r", role: "Designer", score: 82, reason: "Gerçek eşleşme nedeni" }], profile: { completion: 80 }, locked: [] };
function routeHarness(plan, { role = "freelancer", userId = "me", limited = false } = {}) {
  const calls = [];
  const route = compile("app/api/ai/freelancer-workspace/route.ts", name => {
    if (name === "next/server") return { NextResponse: { json: (body, settings = {}) => ({ body, status: settings.status ?? 200, headers: settings.headers }) } };
    if (name.includes("assistantOptions")) return { buildAssistantOptions: async () => { calls.push("metadata"); return { plan }; } };
    if (name.includes("supabase/server")) return { createClient: async () => db() };
    if (name.includes("premium")) return { requireFeatureAccess: async (_db, feature) => {
      calls.push(feature); const context = { ...access(plan), role, userId };
      return { ok: userId !== null && premium.canUseFeature(context, feature), context };
    } };
    if (name.includes("rateLimit")) return { checkRateLimit: async () => { calls.push("limit"); return { ok: !limited }; }, rateLimitKey: () => "key", RATE_LIMIT_MESSAGE: "Yavaşla" };
    if (name.includes("workspace")) return { buildFreelancerWorkspace: async () => { calls.push("matching"); return matching; } };
    throw Error(name);
  });
  return { route, calls, get: tool => route.GET(new Request("http://local.invalid/api/ai/freelancer-workspace" + (tool ? "?tool=" + tool : ""))) };
}
function viewRequire(name, react = React) {
  if (name === "react") return react;
  if (name === "react/jsx-runtime") return jsx;
  if (name === "next/image") return { __esModule: true, default: props => React.createElement("img", {src:props.src,alt:props.alt,width:props.width,height:props.height}) };
  if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
  if (name === "lucide-react") return new Proxy({}, { get: () => () => React.createElement("svg") });
  if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
  if (name.includes("PanelPrimitives")) return { panelRootClass: "panel" };
  if (name.includes("assistantContracts")) return contracts;
  throw Error(name);
}
const View = compile("components/ai-workspace/FreelancerAssistant.tsx", viewRequire).FreelancerAssistant;
function render(workspace, state = {}) { return renderToStaticMarkup(React.createElement(View, { workspace, loading: false, error: "", onRetry() {}, ...state })); }

test("Plus gets five premium feature families while Pro gates stay separate", async () => {
  const data = await options.buildAssistantOptions(db(), access("plus"));
  for (const id of ["matching", "proposal", "profile", "project", "performance", "alerts"]) assert.equal(data.capabilities.find(c => c.id === id).allowed, true);
  for (const id of ["competition", "advanced-profile", "advanced-matching"]) assert.equal(data.capabilities.find(c => c.id === id).allowed, false);
});
test("Pro inherits Plus and Free gets only honest upgrade links", async () => {
  for (const plan of ["pro", "free"]) {
    const data = await options.buildAssistantOptions(db(), access(plan));
    assert.ok(data.capabilities.every(c => c.allowed === (plan === "pro")));
    assert.equal(data.capabilities.every(c => c.requiredPlan === premium.FEATURE_MATRIX[contracts.capabilityFor(c.id).feature].minPlan), true);
  }
});
test("bootstrap counts only own proposals and uses accessible open project metadata", async () => {
  const supabase = db(), data = await options.buildAssistantOptions(supabase, access("plus"));
  assert.equal(data.briefing.proposalCount, 1); assert.equal(data.briefing.profileCompletion, 80);
  assert.equal(data.projects.length, 1); assert.equal(data.projects[0].id, "p");
  assert.ok(supabase.calls.some(c => c.table === "proposals" && c.key === "freelancer_id" && c.value === "me"));
  assert.ok(supabase.calls.some(c => c.table === "profiles" && c.key === "id" && c.value === "me"));
});
test("failed data reads cannot become fabricated zero-count briefing", async () => {
  await assert.rejects(options.buildAssistantOptions(db({ failure: true }), access("plus")), /verileri yüklenemedi/);
});
test("default page load never invokes matching, rate limit or an AI provider", async () => {
  const harness = routeHarness("free"), result = await harness.get();
  assert.equal(result.status, 200);
  assert.deepEqual(harness.calls, ["project_discovery", "metadata"]);
  assert.equal(result.headers["Cache-Control"], "private, no-store");
  assert.equal(harness.route.POST, undefined);
});
test("server rejects unauthenticated and client requests before tool invocation", async () => {
  for (const [settings, status] of [[{ userId: null }, 401], [{ role: "client" }, 403]]) {
    const h = routeHarness("pro", settings); assert.equal((await h.get("matching")).status, status); assert.equal(h.calls.includes("matching"), false);
  }
});
test("Free cannot run Plus matching; Plus cannot request Pro matching directly", async () => {
  for (const [plan, tool] of [["free", "matching"], ["plus", "advanced-matching"]]) {
    const h = routeHarness(plan); assert.equal((await h.get(tool)).status, 403); assert.equal(h.calls.includes("matching"), false);
  }
});
test("explicit matching uses existing engine only after entitlement and rate checks", async () => {
  for (const [plan, tool, feature] of [["plus", "matching", "matching_explanation"], ["pro", "advanced-matching", "advanced_matching"]]) {
    const h = routeHarness(plan); assert.equal((await h.get(tool)).status, 200);
    assert.deepEqual(h.calls, [feature, "limit", "matching"]);
  }
});
test("rate limit and unknown tools cannot execute matching", async () => {
  const h = routeHarness("pro", { limited: true }); assert.equal((await h.get("matching")).status, 429); assert.equal(h.calls.includes("matching"), false);
  const invalid = routeHarness("pro"); assert.equal((await invalid.get("chat")).status, 400); assert.deepEqual(invalid.calls, []);
});
test("main view contains four tools and no composer, fake chat control or conversation", async () => {
  const html = render(await options.buildAssistantOptions(db(), access("plus")));
  for (const text of ["Daha iyi projeler", "daha güçlü teklifler", "AI Araçları", "AI Briefing", "CollaCrew AI Sohbet", "Yakında", "Gelişmiş AI özellikleri"]) assert.ok(html.includes(text));
  assert.equal((html.match(/class="tool"/g) ?? []).length, 4);
  for (const text of ["textarea", ">Gönder<", "AI bağlamı", "CHAT_NOT_CONNECTED", "Mevcut analizlerin", "Son konuşmalar"]) assert.equal(html.includes(text), false);
  assert.ok(html.includes("Henüz") === false); assert.ok(html.includes("1 teklif kaydın"));
});
test("unrun analysis has instructions rather than invented matches; empty records are honest", async () => {
  const html = render(await options.buildAssistantOptions(db({ empty: true }), access("free")));
  assert.ok(html.includes("Henüz teklif kaydın yok")); assert.ok(html.includes("eşleşme analizini başlat"));
  assert.equal(html.includes("0 güçlü eşleşme"), false); assert.ok(html.includes('href="/premium"'));
});
test("loading and error states remain accessible without interactive fake tools", () => {
  const loading = render(null, { loading: true }); assert.ok(loading.includes('role="status"')); assert.equal(loading.includes("textarea"), false);
  const error = render(null, { error: "Çalışma alanı yüklenemedi" }); assert.ok(error.includes('role="alert"')); assert.ok(error.includes("Tekrar dene"));
});

// Execute the actual event handlers with a minimal hook harness, without a browser.
function uiHarness(workspace, responses) {
  let cursor = 0; const hooks = [], calls = [];
  const react = { useCallback(fn) { return fn; }, useEffect() {}, useState(initial) { const key = cursor++; if (!(key in hooks)) hooks[key] = initial; return [hooks[key], value => { hooks[key] = typeof value === "function" ? value(hooks[key]) : value; }]; }, useRef(initial) { const key = cursor++; if (!(key in hooks)) hooks[key] = { current: initial }; return hooks[key]; } };
  const Component = compile("components/ai-workspace/FreelancerAssistant.tsx", name => viewRequire(name, react), {
    fetch: async (url, init) => { calls.push({ url, init }); const response = responses(url, init); return { ok: response.ok ?? true, json: async () => response.body }; },
  }).FreelancerAssistant;
  function nodes(tree) { if (!tree || typeof tree !== "object") return []; const children = tree.props?.children; return [tree, ...[children].flat(Infinity).flatMap(nodes)]; }
  return { calls, render() { cursor = 0; return nodes(Component({ workspace, loading: false, error: "", onRetry() {} })); } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test("matching runs only on click, repeated context reuses successful response", async () => {
  const h = uiHarness(await options.buildAssistantOptions(db(), access("plus")), () => ({ body: matching }));
  const click = () => h.render().find(node => node.type === "button" && node.props.children === "Analizi başlat").props.onClick();
  assert.equal(h.calls.length, 0); const handler=h.render().find(node=>node.type==="button"&&node.props.children==="Analizi başlat").props.onClick; handler(); handler(); await tick(); assert.equal(h.calls.length, 1);
  click(); await tick(); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, "/api/ai/freelancer-workspace?tool=matching");
});
test("project evaluation sends only selected projectId, caches per context; proposal opens existing route", async () => {
  const data = await options.buildAssistantOptions(db(), access("plus"));
  data.projects.push({ id: "p2", title: "İkinci proje" });
  const h = uiHarness(data, () => ({ body: { matching: [] } }));
  let nodes = h.render(); const selects = nodes.filter(node => node.type === "select");
  selects[0].props.onChange({ target: { value: "p" } }); selects[1].props.onChange({ target: { value: "p" } });
  nodes = h.render();
  assert.ok(nodes.some(node => node.props?.href === "/freelancers/discover/p" && String(node.props.children).includes("Teklifini geliştir")));
  nodes.find(node => node.type === "button" && node.props.children === "Projeyi değerlendir").props.onClick(); await tick();
  assert.equal(h.calls[0].url, "/api/ai/match-talent"); assert.equal(h.calls[0].init.body, '{"projectId":"p"}');
  h.render().filter(node => node.type === "select")[1].props.onChange({ target: { value: "p2" } });
  h.render().find(node => node.type === "button" && node.props.children === "Projeyi değerlendir").props.onClick(); await tick();
  assert.equal(h.calls.length, 2); assert.equal(h.calls[1].init.body, '{"projectId":"p2"}');
});
test("failed tool requests are retriable and do not poison cache or briefing", async () => {
  const h = uiHarness(await options.buildAssistantOptions(db(), access("plus")), () => ({ ok: false, body: { error: "Kota dolu" } }));
  for (let i = 0; i < 2; i++) { h.render().find(node => node.type === "button" && node.props.children === "Analizi başlat").props.onClick(); await tick(); }
  assert.equal(h.calls.length, 2); assert.ok(h.render().some(node => node.props?.role === "alert" && node.props.children.includes("Kota dolu")));
});
