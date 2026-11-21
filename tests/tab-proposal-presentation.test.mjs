import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";
function compile(file,load=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,module:{exports},require:name=>name==="react/jsx-runtime"?jsx:load(name),Intl});return exports;}
const {Tabs}=compile("components/ui/Tabs.tsx");
test("shared tabs preserve order, counts and selection without extra controls",()=>{const tree=Tabs({items:[{value:"all",label:"Tümü",count:3},{value:"active",label:"Aktif",count:1}],value:"active",onChange(){}});assert.equal(tree.props.children.length,2);assert.deepEqual(Array.from(tree.props.children,t=>t.props.children[1]),["Tümü","Aktif"]);assert.equal(tree.props.children[1].props["aria-selected"],true);assert.equal(tree.props.children[0].props["aria-selected"],false);const html=renderToStaticMarkup(tree);assert.equal((html.match(/role="tab"/g)||[]).length,2);assert.ok(html.includes("cc-horizontal-nav"));});
test("tab keyboard navigation still changes and focuses the requested tab",()=>{let selected,focused,prevented;const tree=Tabs({items:[{value:"a",label:"A"},{value:"b",label:"B"}],value:"a",onChange:v=>selected=v});const event={key:"ArrowRight",preventDefault:()=>prevented=true,currentTarget:{parentElement:{querySelectorAll:()=>[{focus:()=>focused=0},{focus:()=>focused=1}]}}};tree.props.children[0].props.onKeyDown(event);assert.equal(selected,"b");assert.equal(focused,1);assert.equal(prevented,true);event.key="Home";tree.props.children[1].props.onKeyDown(event);assert.equal(selected,"a");});
const currency=compile("lib/utils/formatCurrency.ts");
const linkModule = { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
const iconModule = new Proxy({}, { get: () => ({ size, className } = {}) => React.createElement("svg", { width: size, height: size, className }) });
const buttonModule = { buttonClasses: () => "" };
const compactCard = compile("components/proposals/ProposalCard.tsx", name => {
  if (name === "next/link") return linkModule;
  if (name === "lucide-react") return iconModule;
  if (name.includes("/Button")) return buttonModule;
  return {};
});
function renderProposal(amount,rate=.12,{expanded=false,status="rejected",tab="received",extraSkills=false}={}){let index=0;const proposal={id:"offer",project_id:"p",freelancer_id:"f",role:"Design",bid_amount:amount,delivery_days:12,cover_letter:"Gerçek teklif açıklaması",status,created_at:"2026-10-01",viewed_at:null,project:{id:"p",title:"Gerçek proje",client_id:"me",status:"open",commission_rate:rate,budget_breakdown:[]},freelancer:{id:"f",first_name:"Ayda",title:"Designer",skills:["Figma","Research","Design","Prototyping","Accessibility","Branding","Illustration"]}};const invitation={id:"invite",project_id:"p",freelancer_id:"f",role:"Design",budget_per_person:amount,duration:"12 gün",message:"Gerçek davet mesajı",status,project:proposal.project,freelancer:proposal.freelancer};const detailsId=tab==="received"?"proposal-details-offer":"proposal-details-invitation-invite";const values=[tab,"all","all",[proposal],false,"",null,[invitation],false,"",null,expanded ? detailsId : null,extraSkills];const react={useId:()=>"proposal-details",useMemo:f=>f(),useEffect(){},useState:()=>[values[index++],()=>{}]};const Page=compile("components/client/ClientProposalsPanel.tsx",name=>{if(name==="react")return react;if(name==="next/link")return {__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};if(name==="lucide-react")return new Proxy({},{get:()=>()=>React.createElement("svg")});if(name.includes("supabase/client"))return {createClient:()=>({})};if(name.includes("formatCurrency"))return currency;if(name.includes("displayName"))return {publicDisplayName:p=>p.first_name};if(name.includes("Tabs"))return {Tabs};if(name.includes("FilterBar"))return {FilterBar:()=>null};if(name.includes("/Button"))return buttonModule;if(name.includes("/ProposalCard"))return compactCard;return {};}).default;return renderToStaticMarkup(React.createElement(Page));}
test("proposal shows the actual offer and delivery, never a fee-inclusive total",()=>{for(const rate of [.12,.15]){const html=renderProposal(20000,rate);for(const text of ["Teklif Tutarı",currency.formatCurrency(20000),"12 gün","Gerçek teklif açıklaması"])assert.ok(html.includes(text));for(const text of ["Platform hizmet bedeli","Toplam maliyet",currency.formatCurrency(22400),currency.formatCurrency(23000)])assert.equal(html.includes(text),false);}});
test("missing offer is honest while a stored zero is preserved",()=>{assert.ok(renderProposal(null).includes("Belirtilmedi"));assert.equal(renderProposal(null).includes(currency.formatCurrency(0)),false);assert.ok(renderProposal(0).includes(currency.formatCurrency(0)));});
test("compact proposal keeps decisions visible and puts secondary content in the disclosure", () => {
  const collapsed = renderProposal(20000, .12, { status: "pending" });
  const summary = collapsed.split('id="proposal-details-offer"')[0];
  for (const label of ["Ayda", "İnceleniyor", "12 gün", "Kısa listeye al", "Kabul et", "Reddet"]) {
    assert.ok(summary.includes(label), label);
  }
  assert.doesNotMatch(summary, /Gerçek teklif açıklaması|Figma/);
  assert.match(collapsed, /aria-expanded="false" aria-controls="proposal-details-offer"/);
  assert.match(collapsed, /id="proposal-details-offer" hidden=""/);

  const expanded = renderProposal(20000, .12, { expanded: true });
  assert.match(expanded, /aria-expanded="true" aria-controls="proposal-details-offer"/);
  assert.doesNotMatch(expanded, /id="proposal-details-offer" hidden=""/);
  assert.match(expanded, /id="proposal-details-offer".*Gerçek teklif açıklaması.*Figma/);
});
test("only actions for the current proposal status are present", () => {
  const shortlisted = renderProposal(20000, .12, { status: "shortlisted" });
  assert.match(shortlisted, /Kabul et.*Reddet/);
  assert.doesNotMatch(shortlisted, /Kısa listeye al|Mesaj Gönder/);
  const accepted = renderProposal(20000, .12, { status: "accepted" });
  assert.match(accepted, /\/client\/messages\?user=f&amp;proposal=offer/);
  assert.doesNotMatch(accepted, /Kabul et<|Kısa listeye al|Reddet</);
  for (const status of ["rejected", "withdrawn", "expired"]) {
    const markup = renderProposal(20000, .12, { status });
    assert.match(markup, /Detay/);
    assert.match(markup, /Projeyi Görüntüle/);
    assert.doesNotMatch(markup, /Mesaj Gönder|Kabul et<|Kısa listeye al|Reddet</);
  }
});
test("skills disclosure shows five tags and controls the remaining two", () => {
  const options = { expanded: true };
  const collapsed = renderProposal(20000, .12, options);
  const visible = collapsed.split('id="proposal-details-offer-skills"')[0];
  for (const skill of ["Figma", "Research", "Design", "Prototyping", "Accessibility"]) {
    assert.ok(visible.includes(`>${skill}<`), skill);
  }
  assert.doesNotMatch(visible, /Branding|Illustration/);
  assert.match(collapsed, /id="proposal-details-offer-skills" hidden="".*Branding.*Illustration/);
  assert.match(collapsed, /aria-expanded="false" aria-label="2 ek yeteneği göster"[^>]*>\+2</);
  const expanded = renderProposal(20000, .12, { ...options, extraSkills: true });
  assert.match(expanded, /id="proposal-details-offer-skills" class="contents".*Illustration/);
  assert.match(expanded, /aria-expanded="true" aria-label="Ek yetenekleri gizle"/);
});
test("sent invitations share the compact disclosure and keep their status actions", () => {
  const pending = renderProposal(20000, .12, { tab: "sent", status: "pending" });
  assert.match(pending, /Davet bütçesi.*12 gün.*Daveti İptal Et/);
  assert.match(pending, /id="proposal-details-invitation-invite" hidden="".*Davet mesajı/);
  const accepted = renderProposal(20000, .12, { tab: "sent", status: "accepted", expanded: true });
  assert.match(accepted, /\/client\/messages\?user=f&amp;project=p/);
  assert.doesNotMatch(accepted, /Daveti İptal Et|id="proposal-details-invitation-invite" hidden=""/);
});
function renderFreelancerOffers({ tab = "sent", status = "pending", expanded = false, filter = "all" } = {}) {
  const project = { id: "p", title: "Örnek proje", client_id: "c", project_type: "Tasarım" };
  const common = { status, project, project_id: "p", role: "Tasarımcı", created_at: "2026-10-01" };
  const proposal = { ...common, id: "offer", bid_amount: 20000, delivery_days: 12, cover_letter: "Uzun teklif mesajı" };
  const invitation = { ...common, id: "invite", client_id: "c", budget_per_person: 15000, duration: "10 gün", message: "Uzun davet mesajı" };
  const detailsId = tab === "sent" ? "freelancer-proposal-offer" : "freelancer-invitation-invite";
  const values = [tab, false, [proposal], false, "", filter, [invitation], false, "", filter, null, expanded ? detailsId : null];
  let index = 0;
  const page = compile("app/freelancers/proposals/page.tsx", name => {
    if (name === "react") return { useId: () => "freelancer", useMemo: callback => callback(), useEffect() {}, useState: () => [values[index++], () => {}] };
    if (name === "next/link") return linkModule;
    if (name === "lucide-react") return iconModule;
    if (name.includes("/Button")) return buttonModule;
    if (name.includes("/ProposalCard")) return compactCard;
    if (name.includes("/PanelPrimitives")) return { panelRootClass: "panel", PanelBadge: ({ children }) => React.createElement("span", null, children) };
    if (name.includes("/DashboardMascot")) return { DashboardMascot: () => null };
    if (name.includes("supabase/client")) return { createClient: () => ({}) };
    if (name.endsWith(".css")) return { __esModule: true, default: {} };
    return {};
  }).default;
  return renderToStaticMarkup(React.createElement(page));
}

test("freelancer proposals keep messages in the summary and project navigation inside details", () => {
  const markup = renderFreelancerOffers({ status: "shortlisted", filter: "shortlisted" });
  const [summary, details] = markup.split('id="freelancer-proposal-offer"');
  assert.match(summary, /Örnek proje.*Kısa Listede.*Teklif Tutarı.*12 gün/);
  assert.match(summary, /\/freelancers\/messages\?user=c&amp;proposal=offer/);
  assert.doesNotMatch(summary, /Uzun teklif mesajı|Teklifimi Göster|Projeyi Görüntüle/);
  assert.match(details, /^ hidden="".*Uzun teklif mesajı.*class="flex justify-end border-t [^"]*"[^>]*><a href="\/freelancers\/discover\/p"[^>]*><svg[^>]*><\/svg>Projeyi Görüntüle<\/a>/);
  assert.match(renderFreelancerOffers({ expanded: true }), /aria-expanded="true" aria-controls="freelancer-proposal-offer"/);
});

test("freelancer invitation cards keep actions and labels tied to invitation status", () => {
  const pending = renderFreelancerOffers({ tab: "received" });
  assert.match(pending, /Kişi Başı Bütçe.*10 gün.*Kabul Et.*Reddet/);
  assert.match(pending, /\/freelancers\/messages\?user=c&amp;project=p/);
  assert.match(pending, /id="freelancer-invitation-invite" hidden="".*Uzun davet mesajı/);
  for (const [status, label] of [["accepted", "Kabul Edildi"], ["rejected", "Reddedildi"], ["cancelled", "İptal Edildi"]]) {
    const markup = renderFreelancerOffers({ tab: "received", status });
    assert.match(markup, new RegExp(`>${label}</span>`, "i"));
    assert.doesNotMatch(markup, />Kabul Et<|>Reddet</);
  }
});

test("all four offer lists use the same title, status, detail and project-link layout", () => {
  const cards = [
    [renderProposal(20000, .12, { expanded: true, status: "pending" }), "/client/projects/p", "Ayda"],
    [renderProposal(20000, .12, { expanded: true, status: "pending", tab: "sent" }), "/client/projects/p", "Ayda"],
    [renderFreelancerOffers({ expanded: true }), "/freelancers/discover/p", "Örnek proje"],
    [renderFreelancerOffers({ expanded: true, tab: "received" }), "/freelancers/discover/p", "Örnek proje"],
  ];
  for (const [markup, destination, title] of cards) {
    assert.match(markup, /grid-cols-\[minmax\(0,auto\)_auto\]/);
    assert.match(markup, new RegExp(`title="${title}"[^>]*>[^<]*</(?:a|h2)><span class="[^"]*bg-amber-50`));
    assert.match(markup, /aria-expanded="true" aria-controls="[^"]+"/);
    assert.match(markup, /space-y-2\.5 border-t[^"]*px-4 py-3 text-sm sm:px-5/);
    assert.match(markup, new RegExp(`flex justify-end border-t [^"]*"[^>]*><a href="${destination}"[^>]*><svg[^>]*width="14"[^>]*></svg>Projeyi Görüntüle</a>`));
  }
});
test("horizontal navigation suppresses vertical gutters while retaining horizontal scrolling",()=>{const css=fs.readFileSync("app/globals.css","utf8");const rule=css.match(/\.cc-horizontal-nav\s*\{([^}]+)\}/)[1];assert.match(rule,/overflow-x:\s*auto/);assert.match(rule,/overflow-y:\s*hidden/);assert.match(rule,/scrollbar-width:\s*none/);for(const file of ["app/freelancers/proposals/page.tsx","app/freelancers/notifications/page.tsx"])assert.ok(fs.readFileSync(file,"utf8").includes("cc-horizontal-nav"));});
