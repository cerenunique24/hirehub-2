import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
function loadRig() {
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync("components/projects/creation/AnalysisMascot.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,module:{exports},require:name=>name==="react/jsx-runtime"?jsx:name.endsWith(".json")?JSON.parse(fs.readFileSync("public/images/mascots/analysis-rig/parts.json","utf8")):{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})}});
 return exports;
}
function loadLoading() {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("components/projects/creation/ProjectAnalysisLoading.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,module:{exports},require:name=>name==="react/jsx-runtime"?jsx:name==="./AnalysisMascot"?loadRig():name==="next/image"?{__esModule:true,default:props=>React.createElement("img",props)}:name==="lucide-react"?new Proxy({},{get:()=>props=>React.createElement("svg",props)}):{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})}});
  return exports;
}
function loadReview() { const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync("components/projects/creation/ProjectTeamReview.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:name=>name==="react/jsx-runtime"?jsx:name==="react"?React:name==="next/link"?{__esModule:true,default:p=>React.createElement("a",p)}:name==="lucide-react"?new Proxy({},{get:()=>p=>React.createElement("svg",p)}):{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})},Intl});return exports;}
function load(access = false, deep = false, loading = false) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("components/projects/creation/ProjectAnalysisSummary.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, {
    exports, module: { exports }, require: name => name.includes("ProjectTeamReview") ? loadReview() : name === "react/jsx-runtime" ? jsx : name === "next/image" ? { __esModule:true, default: props=>React.createElement("img",props) } : name.includes("ProjectAnalysisLoading") ? loadLoading() : name === "lucide-react" ? new Proxy({}, { get: () => props => React.createElement("svg", props) }) : name.includes("usePremium") ? { usePremium: () => ({ loading, can: key => key === "advanced_project_analysis" ? access : deep }) } : name.includes("Button") ? { Button: ({ children, ...props }) => React.createElement("button", Object.fromEntries(Object.entries(props).filter(([key]) => key !== "variant" && key !== "size")), children) } : name.endsWith(".css") ? { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) } : {}
  });
  return exports;
}
const analysis = { summary: "A genuine brief summary", roleDetails: [{role:"Designer", requiredSkills:["Figma"], responsibilities:["Design"], reason:"The brief needs interface design"}], requiredSkills:["figma","Prototype"], considerations:["Clarify the handoff"], recommendations:["Discuss the approval owner"] };
const roles = [{name:"Designer",skills:["Figma"],responsibilities:["Design"]}];
const advancedAnalysis = { skillGapInsights:["Plus private finding"], budgetDurationAssessment:{insight:"Budget is set in the later step",flags:[]} };
const proAnalysis = {teamCompositionInsight:"Pro private composition",advancedRecommendations:["Discuss the approval owner","Pro unique opportunity"],alternativeRoleSuggestions:[],riskAnalysis:{level:"high",risks:["Pro private risk"]},advancedBudgetInsight:"Pro private budget"};
function props(extra={}) { return { analysis, roles, advancedAnalysis, proAnalysis, canUseDeepAnalysis:true, aiUsage:null, onReviewRoles(){}, ...extra }; }
function html(access=false,deep=false,extra={},loading=false) { return renderToStaticMarkup(React.createElement(load(access,deep,loading).ProjectAnalysisSummary,props(extra))); }
test("coverage deduplicates AI skills, reflects edits and never treats zero skills as healthy",()=>{const api=load();const value=api.analysisCoverage(analysis,roles);assert.equal(value.required.length,2);assert.equal(value.covered,1);assert.deepEqual(Array.from(value.missing),["Prototype"]);assert.equal(api.analysisCoverage(analysis,[{...roles[0],skills:["Figma","prototype"]}]).covered,2);const empty=html(false,false,{analysis:{...analysis,requiredSkills:[],roleDetails:[],considerations:[],recommendations:[]},roles:[]});assert.ok(empty.includes("Beceri önerisi bulunmuyor"));assert.ok(!empty.includes('class="healthy"'));});
test("real findings precede role editing with distinct semantics and honest counts",()=>{const value=html();assert.ok(value.includes("tek bir <span>Designer</span> yeterli görünüyor"));assert.ok(value.includes("Prototype"));assert.ok(value.indexOf('Atanmayan beceriler')<value.indexOf('class="coverage"'));assert.ok(value.includes("Colla AI Proje Analizi"));assert.ok(!value.includes("Kapsamlı Analiz"));assert.ok(!value.includes("Düşük Risk"));assert.ok(!value.includes("82 / 100"));});
test("free, loading and Plus sessions do not expose Pro data even if passed",()=>{for(const [plus,deep,loading] of [[false,false,false],[true,false,false],[true,true,true]]) {const value=html(plus,deep,{},loading);assert.ok(!value.includes("Pro private"));assert.ok(!value.includes("Pro unique opportunity"));}assert.ok(!html().includes("Plus private finding"));assert.ok(!html(true,false).includes("Plus private finding"));assert.ok(!html(true,false).includes("Analizi derinleştir"));});
test("Pro requires entitlement and controller access; serious risk dominates without duplicate recommendation",()=>{const value=html(true,true);assert.ok(value.includes("Pro private risk"));assert.ok(value.includes("Clarify the handoff"));assert.equal(value.split("Pro private risk").length-1,1);assert.ok(!value.includes("Derinlemesine analiz"));assert.equal(value.split("Discuss the approval owner").length-1,1);assert.ok(!html(true,true,{canUseDeepAnalysis:false}).includes("Pro private"));});
test("review actions forward real skill and optional role callbacks without writes on render",()=>{const calls=[];const tree=load(true).ProjectAnalysisSummary(props({onAssignSkill:(...args)=>calls.push(args),onAddOptionalRole:value=>calls.push(value)}));function find(node){if(!node)return null;if(Array.isArray(node)){for(const child of node){const match=find(child);if(match)return match;}return null;}if(node.type?.name==='ProjectTeamReview')return node;return find(node.props?.children);}const review=find(tree);assert.equal(calls.length,0);review.props.onAssign('Prototype','design');review.props.onAdd({name:'QA',reason:'Launch testing'});assert.deepEqual(calls,[['Prototype','design'],{name:'QA',reason:'Launch testing'}]);});

test("quota exhaustion preserves base analysis without a placeholder premium panel",()=>{const value=html(true,false,{advancedAnalysis:null,aiUsage:{count:5,monthlyLimit:5,limitReached:true}});assert.ok(!value.includes("5 / 5"));assert.ok(!value.includes("Analizi derinleştir"));assert.ok(value.includes("Colla AI analizi"));});

test("analysis uses the floating mascot while the result has no loading artwork", () => {
  const { ProjectAnalysisLoading } = loadLoading();
  const markup = renderToStaticMarkup(React.createElement(ProjectAnalysisLoading));
  const styles = fs.readFileSync("components/projects/creation/ProjectAnalysisLoading.module.css", "utf8");
  assert.match(markup, /class="scene" aria-hidden="true"/);
  assert.match(markup, /class="mascotFloat"><img[^>]*src="\/images\/mascots\/client-discovery-search\.png"/);
  assert.match(styles, /\.mascotFloat\s*\{[^}]*animation:\s*mascotFloat\b/);
  assert.match(markup, /role="status" aria-live="polite" aria-busy="true"/);
  const inactive = renderToStaticMarkup(React.createElement(ProjectAnalysisLoading, { active: false }));
  assert.match(inactive, /<div class="loading" hidden="" aria-hidden="true"/);
  assert.doesNotMatch(inactive, /role="status"|aria-busy="true"/);
  assert.doesNotMatch(html(), /<img\b|aria-busy="true"/);
});

test("processing copy distinguishes the two real operations without fake completion",()=>{const loadingExports=loadLoading();const project=renderToStaticMarkup(React.createElement(loadingExports.ProjectAnalysisLoading));const match=renderToStaticMarkup(React.createElement(loadingExports.ProjectAnalysisLoading,{kind:"matching"}));assert.ok(project.includes("Proje detayları inceleniyor"));assert.ok(match.includes("Rol ihtiyaçları değerlendiriliyor"));assert.ok(!match.includes("progressbar"));assert.ok(!match.includes("incelendi"));});

test("loader describes four areas of work without reporting completion", () => {
  const { ProjectAnalysisLoading } = loadLoading();
  for (const kind of ["project", "matching"]) {
    const markup = renderToStaticMarkup(React.createElement(ProjectAnalysisLoading, { kind }));
    assert.match(markup, /ANALİZ KAPSAMI.*İşleniyor/);
    const scope = markup.match(/<ol>(.*?)<\/ol>/)?.[1] ?? "";
    const items = Array.from(scope.matchAll(/<li class="([^"]+)">/g), ([, state]) => state);
    assert.deepEqual(items, ["current", "pending", "pending", "pending"]);
    assert.equal(Array.from(scope.matchAll(/class="indicator" aria-hidden="true"/g)).length, 4);
    assert.doesNotMatch(markup, /progressbar|aria-valuenow|<progress\b|bilgileri hazır/);
  }
});

 test("numbered sprites retain independent limbs, prop and authored expressions",()=>{const rig=loadRig();const value=renderToStaticMarkup(React.createElement(rig.AnalysisMascot));for(const id of [2,3,4,5,6,7,8,10,13])assert.ok(value.includes(`data-mascot-part="${id}"`));assert.equal((value.match(/class="rightAssembly"/g)||[]).length,1);assert.ok(!value.includes("client-discovery-search.png"));const manifest=JSON.parse(fs.readFileSync("public/images/mascots/analysis-rig/parts.json","utf8"));assert.equal(new Set(manifest.parts.map(p=>p.id)).size,21);for(const part of manifest.parts){assert.ok(part.x>=0&&part.y>=0&&part.x+part.width<=manifest.width&&part.y+part.height<=manifest.height);}});

test("role recommendation remains visible without placeholder premium details; metrics use current coverage",()=>{const value=html(true,true,{recommendations:React.createElement("div",null,"Current role recommendation")});assert.ok(value.includes("Current role recommendation"));assert.ok(!value.includes("Analizi derinleştir"));assert.ok(value.includes("1 / 2"));const complete=html(false,false,{roles:[{...roles[0],skills:["Figma","Prototype"]}],analysis:{...analysis,considerations:[]}});assert.ok(!complete.includes("Beceri kapsamını tamamla"));assert.ok(!complete.includes("<meter"));assert.ok(complete.includes("Tüm temel beceriler karşılanıyor"));const single=html(false,false,{roles:[{...roles[0],memberCount:1}]});assert.ok(single.includes("tek bir <span>Designer</span>"));const multiple=html(false,false,{roles:[roles[0],{...roles[0],name:"Developer"}],analysis:{...analysis,roleDetails:[...analysis.roleDetails,{...analysis.roleDetails[0],role:"Developer"}]}});assert.ok(multiple.includes("2 rolden oluşan"));assert.ok(multiple.includes("Colla AI Proje Analizi"));});

test("decision explanation uses actual summary or actual AI reasoning without fabricated copy",()=>{assert.ok(html().includes("A genuine brief summary"));const fallback=html(false,false,{analysis:{...analysis,summary:"  "}});assert.ok(fallback.includes('class="description">The brief needs interface design</p>'));const absent=html(false,false,{analysis:{...analysis,summary:"",roleDetails:[]}});assert.ok(!absent.includes('class="description"'));const incomplete=html();assert.match(incomplete,/<meter[^>]*max="2"[^>]*value="1"/);});
