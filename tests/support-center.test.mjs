import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";
function compile(path,require=()=>({}),globals={}) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,module:{exports},require,Date,console,...globals});return exports;
}
const support=compile("lib/support.ts"),presentation=compile("lib/supportPresentation.ts");
const labels=compile("lib/marketplace/labels.ts");
const ticket={id:"ticket-12345678",user_id:"me",subject:"Ödeme durumum",category:"Ödeme",description:"Gerçek açıklama",related_project_id:"p",priority:"high",status:"open",created_at:"2026-10-01T10:00:00Z",updated_at:"2026-10-02T11:00:00Z"};
const messages=[{id:"m1",ticket_id:ticket.id,sender_id:"me",message:"İşlem bilgim",created_at:"2026-10-02T12:00:00Z"},{id:"m2",ticket_id:ticket.id,sender_id:"admin",message:"Kaydınızı inceliyoruz.",created_at:"2026-10-02T13:00:00Z"}];
function deps(name,react=React,db={}){
 if(name==="react")return react;if(name==="react/jsx-runtime")return jsx;
 if(name==="next/link")return {__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};
 if(name==="next/image")return {__esModule:true,default:({priority,...props})=>React.createElement("img",props)};
 if(name==="next/navigation")return {usePathname:()=>"/freelancers/help/tickets/id",useRouter:()=>({replace(){},push(){},refresh(){}})};
 if(name==="lucide-react")return new Proxy({},{get:()=>({size,...props})=>React.createElement("svg",{...props,width:size,height:size})});
 if(name.includes("supabase/client"))return {createClient:()=>db};
 if(name.includes("supportPresentation"))return presentation;if(name==="@/lib/support")return support;
 if(name.includes("marketplace/labels"))return labels;
 if(name.includes("PanelPrimitives"))return {panelRootClass:"panel",PanelBadge:({children,tone})=>React.createElement("span",{"data-panel-tone":tone},children)};
 if(name.includes("ui/Button")){const original=compile("components/ui/Button.tsx",deps);return react===React?original:{...original,Button:"button"};}
 if(name.includes("ui/Input"))return react===React?compile("components/ui/Input.tsx",deps):{Input:"input",Textarea:"textarea"};
 if(name.includes("ui/Select"))return react===React?compile("components/ui/Select.tsx",deps):{__esModule:true,default:"select"};
 if(name.includes("ui/Card"))return compile("components/ui/Card.tsx",deps);
 if(name.includes("ui/PageHeader"))return compile("components/ui/PageHeader.tsx",deps);
 if(name.includes("common/Loading"))return compile("components/common/Loading.tsx",deps);
 if(name.includes("common/EmptyState"))return compile("components/common/EmptyState.tsx",deps);
 if(name.includes("MobileSidebarContext"))return {useMobileSidebar:()=>({open:false,setOpen(){}})};
 if(name.includes("useSidebarCounts"))return {useSidebarCounts:()=>({unreadNotifications:0,unreadMessages:2,pendingProposals:0})};
 if(name.includes("/Avatar"))return {Avatar:()=>React.createElement("span")};
 if(name.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
 throw Error(name);
}
const TicketView=compile("components/support/TicketDetail.tsx",deps).SupportTicketView;
function detail(overrides={}){return renderToStaticMarkup(React.createElement(TicketView,{ticket,messages,projectTitle:"Nova",backHref:"/freelancers/help",reply:"",onReply(){},onSend(){},sending:false,sendError:"",messageError:"",onRefresh(){},...overrides}));}
const draft={userId:"me",topic:"payment",issue:"payment_blocked",subject:" Ödeme ",description:" Açıklama ",projectId:"p"};
test("support draft persists actual project relation, category and issue in description",()=>{const data=presentation.ticketDraft(draft);assert.equal(data.relatedProjectId,"p");assert.equal(data.category,"Ödeme");assert.equal(data.subject,"Ödeme");assert.ok(data.description.startsWith("Sorun türü: Ödeme alınmadı\n\n"));assert.equal(data.priority,"high");assert.equal("subcategory" in data,false);assert.equal("attachment" in data,false);});
test("priority is derived; ordinary technical and withdrawal requests are not urgent",()=>{for(const issue of ["page_error","withdrawal","commission","delivery","unknown"])assert.equal(presentation.ticketPriority(issue),"normal");for(const issue of ["payment_blocked","account_access"])assert.equal(presentation.ticketPriority(issue),"high");});
test("invalid category, cross-category issue and empty requests cannot be sent",()=>{for(const overrides of [{topic:"invented"},{issue:"account_access"},{subject:" "},{description:" "}])assert.throws(()=>presentation.ticketDraft({...draft,...overrides}));});
test("support categories cannot silently absorb disputes or safety reports",()=>{for(const id of ["dispute","safety","report"])assert.equal(presentation.SUPPORT_TOPICS.some(t=>t.id===id),false);assert.equal(presentation.SUPPORT_TOPICS.length,6);});
test("statuses use only backend states with correct operational semantics",()=>{assert.equal(presentation.ticketTone("open"),"open");assert.equal(presentation.ticketTone("in_progress"),"review");assert.equal(presentation.ticketTone("waiting_user"),"waiting");assert.equal(presentation.ticketTone("resolved"),"resolved");assert.equal(presentation.ticketTone("closed"),"closed");assert.equal(presentation.disputeTone("under_review"),"review");assert.equal(presentation.disputeTone("resolved"),"resolved");assert.equal(support.TICKET_STATUS_LABEL.answered,undefined);});
test("open totals exclude closed/resolved, and invalid dates cannot break a screen",()=>{assert.equal(presentation.openTicketCount(["open","in_progress","waiting_user","resolved","closed"].map(status=>({...ticket,status}))),3);assert.equal(presentation.formatSupportDate("invalid"),"Tarih bilinmiyor");});
test("detail identifies real user and support replies, project and status",()=>{const html=detail();for(const text of ["Sen","CollaCrew Destek","Nova","Ödeme","Açık","İşlem bilgim","Kaydınızı inceliyoruz.","Son güncelle"])assert.ok(html.toLowerCase().includes(text.toLowerCase()),text);assert.ok(html.includes('href="/freelancers/projects/p"'));assert.ok(html.includes('data-owner="false"'));});
test("waiting user clearly prompts an operational reply",()=>{const html=detail({ticket:{...ticket,status:"waiting_user"}});assert.ok(html.includes("senden ek bilgi bekliyor"));assert.ok(html.includes("Talebe yanıt ekle"));assert.ok(html.includes('data-tone="waiting"'));});
test("resolved/closed stay distinct and closed routes to a new request",()=>{const resolved=detail({ticket:{...ticket,status:"resolved"}}),closed=detail({ticket:{...ticket,status:"closed"}});assert.ok(resolved.includes('data-tone="resolved"'));assert.ok(closed.includes('data-tone="closed"'));assert.equal(closed.includes("<textarea"),false);assert.ok(closed.includes('href="/freelancers/help/new"'));});
test("message failure never masquerades as empty thread; send errors remain visible",()=>{const html=detail({messages:[],messageError:"Mesajlar yüklenemedi",sendError:"Yanıt gönderilemedi"});assert.ok(html.includes('role="alert"'));assert.ok(html.includes("Yanıt gönderilemedi"));assert.equal(html.includes("Henüz ek mesaj yok"),false);});
test("long message and subject remain real text, no fabricated attachments",()=>{const html=detail({ticket:{...ticket,subject:"Uzun ".repeat(80)},messages:[{...messages[0],message:"Ayrıntı\n".repeat(100)}]});assert.ok(html.includes("Ayrıntı"));assert.equal(html.includes('type="file"'),false);});
function fakeDB({failureTable=null,empty=false}={}){
 const calls=[],insertions=[];
 const tables={support_tickets:empty?[]:[ticket],help_articles:[{id:"faq",audience:"freelancer",category:"Ödeme",question:"Ödeme durumunu nereden takip ederim?",answer:"Kazançlar ekranını incele.",sort_order:1}],project_team_members:[{project_id:"p",freelancer_id:"me",status:"active"}],projects:[{id:"p",title:"Nova"}],disputes:[]};
 return {calls,insertions,auth:{getUser:async()=>({data:{user:{id:"me"}},error:null})},from(table){let data=tables[table]??[],single=false;const q={select(){return q;},eq(key,value){calls.push({table,key,value});data=data.filter(r=>r[key]===value);return q;},in(key,values){data=data.filter(r=>values.includes(r[key]));return q;},order(){return q;},single(){single=true;return q;},insert(input){insertions.push({table,input});data=[{...input,id:"new-ticket",status:"open",created_at:ticket.created_at,updated_at:ticket.created_at}];return q;},then(resolve,reject){return Promise.resolve({data:single?data[0]:data,error:failureTable===table?{message:"Unavailable"}:null}).then(resolve,reject);}};return q;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function nodes(tree){if(!tree||typeof tree!=="object")return [];if(typeof tree.type==="function")return [tree,...nodes(tree.type(tree.props))];return [tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];}
function homeHarness(db,view="home",initialTopic="technical"){
 let cursor=0,first=true;const values=[],effects=[];
 const react={useMemo:fn=>fn(),useState(initial){const index=cursor++;if(!(index in values))values[index]=initial;return [values[index],value=>{values[index]=typeof value==="function"?value(values[index]):value;}];},useRef(initial){const index=cursor++;if(!(index in values))values[index]={current:initial};return values[index];},useEffect(fn){if(first)effects.push(fn);}};
 const Component=compile("components/support/FreelancerSupportCenter.tsx",name=>deps(name,react,db)).default;
 function render(){cursor=0;const tree=Component({view,initialTopic});first=false;return nodes(tree);}
 return {render,async mount(){render();effects.forEach(effect=>effect());await tick();return render();}};
}
test("landing is a navigation hub with six topics, FAQ preview and no management forms",async()=>{const db=fakeDB(),h=homeHarness(db);await h.mount();const tree=h.render();assert.ok(tree.some(n=>n.props?.children==="Yardım Merkezi"));assert.equal(tree.filter(n=>n.type==="a"&&n.props?.href?.startsWith("/freelancers/help/topics/")).length,6);for(const path of ["/freelancers/help/new","/freelancers/help/tickets","/freelancers/help/faq","/freelancers/help/disputes","/freelancers/help/safety"])assert.ok(tree.some(n=>n.props?.href===path),path);assert.equal(tree.some(n=>n.type==="form"||n.type==="textarea"),false);assert.equal(tree.some(n=>n.props?.id==="my-tickets"||n.props?.id==="new-request"||n.props?.id==="disputes-heading"),false);assert.equal(db.calls.some(c=>["support_tickets","project_team_members"].includes(c.table)),false);});
test("empty and load failure states stay distinct",async()=>{const empty=homeHarness(fakeDB({empty:true}),"tickets");await empty.mount();assert.ok(empty.render().some(n=>n.props?.children==="Henüz destek talebin yok"));const failure=homeHarness(fakeDB({failureTable:"support_tickets"}),"tickets");await failure.mount();const tree=failure.render();assert.ok(tree.some(n=>n.props?.role==="alert"));assert.equal(tree.some(n=>n.props?.children==="Henüz destek talebin yok"),false);});
test("dedicated dispute and safety screens retain separate real workflows",async()=>{const dispute=homeHarness(fakeDB(),"disputes");await dispute.mount();assert.ok(dispute.render().some(n=>n.props?.href==="/freelancers/projects/p"));const safety=homeHarness(fakeDB(),"safety");await safety.mount();assert.ok(safety.render().some(n=>n.props?.href==="/freelancers/messages"));assert.ok(safety.render().some(n=>n.props?.href==="/freelancers/help/new?topic=account"));assert.equal(dispute.render().some(n=>n.type==="form"),false);});
test("actual ticket submit uses authenticated user, derived priority and preserves failed drafts",async()=>{const db=fakeDB({empty:true}),h=homeHarness(db,"new","payment");await h.mount();let tree=h.render();tree.find(n=>n.type==="input"&&n.props.placeholder==="Sorununu kısaca özetle").props.onChange({target:{value:"Ödeme alınmadı"}});tree.find(n=>n.type==="textarea").props.onChange({target:{value:"Aşama onaylandı ama ödeme görünmüyor."}});tree=h.render();const form=tree.find(n=>n.type==="form");form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});await tick();assert.equal(db.insertions.length,1);assert.equal(db.insertions[0].table,"support_tickets");assert.equal(db.insertions[0].input.user_id,"me");assert.equal(db.insertions[0].input.priority,"high");assert.ok(h.render().some(n=>n.props?.role==="status"));});
test("topic change resets issue options; technical issues stay normal",async()=>{const h=homeHarness(fakeDB(),"new");await h.mount();let tree=h.render();tree.filter(n=>n.type==="select")[0].props.onChange({target:{value:"payment"}});tree=h.render();assert.equal(tree.filter(n=>n.type==="select")[1].props.value,"payment_blocked");tree.filter(n=>n.type==="select")[0].props.onChange({target:{value:"technical"}});tree=h.render();assert.equal(tree.filter(n=>n.type==="select")[1].props.value,"page_error");});
function sidebarHTML({collapsed=false,desktop=false,role="freelancer"}={}){
 let index=0;const values=[collapsed,true,desktop,"Alex",null];
 const react={useMemo:fn=>fn(),useEffect(){},useState:initial=>[values[index++]??initial,()=>{}]};
 const Sidebar=compile("components/layout/Sidebar.tsx",name=>deps(name,react)).Sidebar;
 const icon=()=>React.createElement("svg");
 return renderToStaticMarkup(Sidebar({menuGroups:[[{name:"Projelerim",href:"/freelancers/projects",icon}],[{name:"Yardım / Destek Talebi",href:"/freelancers/help",icon}]],dashboardHref:"/freelancers/dashboard",profileHref:"/freelancers/profile",roleLabel:"Freelancer",storageKey:"sidebar",countsRole:role,fallbackName:"Alex",resolveProfile:async()=>null}));
}
test("navigation active descendant, long labels and both groups share item tokens",()=>{const html=sidebarHTML();assert.ok(html.includes('aria-current="page"'));assert.equal((html.match(/class="item /g)??[]).length,3);assert.ok(html.includes('aria-label="Yardım / Destek Talebi"'));assert.ok(html.includes('title="Yardım / Destek Talebi"'));});
test("collapsed sidebar preserves names/tooltips; mobile stays expanded",()=>{const collapsed=sidebarHTML({collapsed:true,desktop:true}),mobile=sidebarHTML({collapsed:true,desktop:false});assert.ok(collapsed.includes("collapsedItem"));assert.ok(collapsed.includes('aria-label="Yardım / Destek Talebi"'));assert.equal(mobile.includes("collapsedItem"),false);});
test("both roles share sidebar typography, geometry and focus tokens",()=>{const html=sidebarHTML({role:"client"});assert.equal(html.includes('class="root '),true);const css=fs.readFileSync("components/layout/Sidebar.module.css","utf8");assert.ok(css.includes("--font-size-label"));assert.ok(css.includes("--control-height-lg"));assert.ok(css.includes(":focus-visible"));});

test("landing search keeps a five-question limit while FAQ view exposes the full library",async()=>{const db=fakeDB(),original=db.from;db.from=table=>table==="help_articles"?{select(){return this;},in(){return this;},order(){return Promise.resolve({error:null,data:Array.from({length:9},(_,index)=>({id:"q"+index,category:"Ödeme",question:"Ödeme "+index,answer:"Gerçek kayıt",audience:"freelancer"}))});}}:original(table);const home=homeHarness(db);await home.mount();assert.equal(home.render().filter(n=>n.type==="details").length,5);home.render().find(n=>n.type==="input").props.onChange({target:{value:"Ödeme"}});assert.equal(home.render().filter(n=>n.type==="details").length,5);const faq=homeHarness(db,"faq");await faq.mount();assert.equal(faq.render().filter(n=>n.type==="details").length,9);});
