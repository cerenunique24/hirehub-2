import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const workflow=compile(fs.readFileSync("lib/projects/workflow-state.ts","utf8"));
function compile(source,context={}) {const exports={};vm.runInNewContext(ts.transpileModule(source.replace(/^\uFEFF/,""),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,module:{exports},...context});return exports;}
const view=compile(fs.readFileSync("components/coalitions/coalitionPresentation.ts","utf8"),{require:()=>workflow});
const project={id:"p",title:"Project",status:"in_progress",team_required:true,deadline:null};
const stage=(id,owner,status)=>({id,project_id:"p",title:id,freelancer_id:owner,status,due_date:null,sort_order:0});
test("coalition summary reuses own revision action, not another member's work",()=>{
 const result=view.coalitionWork(project,[stage("other","other","active"),stage("mine","me","revision")],"me",["me","other"]);
 assert.equal(result.currentStage.id,"mine");
 assert.equal(result.currentUserMustAct,true);
 assert.equal(result.state,"Revizyon bekliyor");
});
test("ready coalition project requires Client to start, not freelancer",()=>{
 const result=view.coalitionWork({...project,status:"ready_to_start"},[],"me",["me"]);
 assert.equal(result.actionOwner,"Client");
 assert.equal(result.currentUserMustAct,false);
});
test("unavailable milestones never imply an empty project or fabricated personal action",()=>{
 const result=view.coalitionWork(project,null,"me",["me"]);
 assert.equal(result.state,"Aşama bilgileri alınamadı");
 assert.equal(result.currentUserMustAct,false);
 assert.equal(result.currentStage,null);
});
test("coalition without project cannot fabricate a task",()=>{
 const result=view.coalitionWork(null,[],"me",[]);
 assert.equal(result.currentUserMustAct,false);
 assert.equal(result.total,0);
});
test("team progress counts persisted approved stages",()=>{
 const result=view.coalitionWork(project,[stage("a","me","approved"),stage("b","other","active")],"me",["me","other"]);
 assert.equal(result.approved,1);
 assert.equal(result.total,2);
 assert.equal(result.currentUserMustAct,false);
});
test("completed coalition project has no actionable next stage",()=>{
 const result=view.coalitionWork({...project,status:"completed"},[stage("a","me","approved")],"me",["me"]);
 assert.equal(result.currentUserMustAct,false);
 assert.equal(result.state,"Tamamlandı");
});
test("coalition project links preserve workspace versus discovery routes",()=>{
 for(const status of ["in_progress","completed"]) assert.equal(view.coalitionProjectHref({...project,status}),"/freelancers/projects/p");
 for(const status of ["open","ready_to_start","paused"]) assert.equal(view.coalitionProjectHref({...project,status}),"/freelancers/discover/p");
});
test("stage badges keep active, waiting and revision states distinct",()=>{
 assert.equal(view.coalitionStageLabel("active"),"Çalışma devam ediyor");
 assert.equal(view.coalitionStageLabel("submitted"),"İnceleme bekleniyor");
 assert.equal(view.coalitionStageLabel("revision"),"Revizyon bekliyor");
});

test("coalition activity uses persisted event dates and keeps only five recent events",()=>{
 const result=view.coalitionActivity("2026-10-01",[{id:"m",name:"Ada",joined_at:"2026-10-02"}], [{...stage("s","me","approved"),submitted_at:"2026-10-03",revision_requested_at:"2026-10-04",approved_at:"2026-10-05"},{...stage("s2","other","submitted"),submitted_at:"2026-10-06"}]);
 assert.equal(result.length,5);
 assert.equal(result[0].id,"s2:submitted");
 assert.equal(result[1].text,"Aşama onaylandı: s");
 assert.equal(result.some(event=>event.id==="created"),false);
});
test("coalition activity never invents milestones or dates",()=>{
 const result=view.coalitionActivity("invalid",[],[{...stage("s","me","revision")}]);
 assert.equal(result.length,0);
 assert.equal(view.coalitionActivity("2026-10-01",[],null).length,1);
});

test("coalition action summaries distinguish revision and client review",()=>{
 const revision=[stage("s","me","revision")];
 assert.equal(view.coalitionActionSummary(view.coalitionWork(project,revision,"me",["me"]),project,revision),"Sıradaki: Revizyon teslimi");
 const review=[stage("s","me","submitted")];
 assert.equal(view.coalitionActionSummary(view.coalitionWork(project,review,"me",["me"]),project,review),"Client onayı bekleniyor");
 const other=[stage("s","other","active")];
 assert.equal(view.coalitionActionSummary(view.coalitionWork(project,other,"me",["me","other"]),project,other),"Şu an senden aksiyon beklenmiyor");
});
test("add stage shortcut requires active team project membership",()=>{
 assert.equal(view.coalitionCanAddStage(project,"me",["me"]),true);
 for(const status of ["open","ready_to_start","completed","paused","cancelled"]) assert.equal(view.coalitionCanAddStage({...project,status},"me",["me"]),false);
 assert.equal(view.coalitionCanAddStage({...project,team_required:false},"me",["me"]),false);
 assert.equal(view.coalitionCanAddStage(project,"me",["other"]),false);
 assert.equal(view.coalitionCanAddStage(project,null,["me"]),false);
});

test("coordination summary keeps waiting states neutral and personal revision actionable",()=>{
 const revision=[stage("s","me","revision")];
 assert.equal(view.coalitionDetailSummary(view.coalitionWork(project,revision,"me",["me"]),project,revision).headline,"Revizyon gerekiyor");
 const submitted=[stage("s","me","submitted")];
 assert.equal(view.coalitionDetailSummary(view.coalitionWork(project,submitted,"me",["me"]),project,submitted).headline,"Client onayı bekleniyor");
 const approved=[stage("s","me","approved")];
 assert.equal(view.coalitionDetailSummary(view.coalitionWork(project,approved,"me",["me"]),project,approved).headline,"Tüm aşamalar onaylandı");
 for(const status of ["ready_to_start","completed"]) {
  const p={...project,status};const w=view.coalitionWork(p,[],"me",["me"]);
  assert.equal(w.currentUserMustAct,false);
  assert.equal(view.coalitionDetailSummary(w,p,[]).headline,"Şu an senden aksiyon beklenmiyor");
 }
 assert.equal(view.coalitionDetailSummary(view.coalitionWork(null,[],"me",[]),null,[]).headline,"Durum doğrulanamadı");
 assert.equal(view.coalitionWork(project,[],"me",["me"]).currentUserMustAct,true);
});
function effectBody(path,dependency) {
 const source=fs.readFileSync(path,"utf8"),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let body;
 function walk(n){if(ts.isCallExpression(n)&&n.expression.getText(file)==="useEffect"&&n.arguments[1]?.getText(file).replace(/\s/g,"")===dependency) body=n.arguments[0].getText(file);ts.forEachChild(n,walk);}walk(file);
 assert.ok(body,"effect found: "+dependency);return ts.transpileModule("("+body+")()",{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
}
test("team message autoscroll moves only its container, never the page",()=>{
 const container={scrollTop:0,scrollHeight:420};
 vm.runInNewContext(effectBody("components/coalitions/TeamMessagesPanel.tsx","[messages.length]"),{messagesRef:{current:container}});
 assert.equal(container.scrollTop,420);
});
test("coalition overview opens at top; only explicit message hash opens messages",()=>{
 const effect=effectBody("app/freelancers/coalitions/[id]/page.tsx","[loading,errorMessage]");
 for(const hash of ["","#team-messages"]) {
  let top=0,messages=0;
  vm.runInNewContext(effect,{loading:false,errorMessage:"",window:{location:{hash}},requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},overviewRef:{current:{scrollIntoView(){top++;}}},document:{getElementById:id=>{assert.equal(id,"team-messages");return {scrollIntoView(){messages++;}};}}});
  assert.equal(top,hash?0:1);assert.equal(messages,hash?1:0);
 }
});
