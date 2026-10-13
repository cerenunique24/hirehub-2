import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

let semanticCalls = 0;
let semanticResult = null;
function load(path, cache = new Map()) {
 if (cache.has(path)) return cache.get(path);
 const exports = {};
 cache.set(path, exports);
 const source = fs.readFileSync(path, "utf8");
 vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {
  exports, module:{exports}, console, process,
  require(name) {
   if(name === "@/lib/server/trust") return {getServerSigningSecret:()=> "test-only"};
   if(name === "@/lib/ai/semanticMatch") return {reviewMatchPairs:async()=>{semanticCalls++;return semanticResult;}};
   if(name === "@/lib/ai/semanticMatchCache") return {getCachedSemanticVerdicts:async()=>null,setCachedSemanticVerdicts:async()=>{}};
   if(name.startsWith("@/")) return load(name.replace("@/","")+".ts",cache);
   throw new Error("Unexpected import "+name);
  },
 });
 return exports;
}
const matcher = load("lib/ai/match-talent.ts");
const taxonomy = load("lib/matching/roleEligibility.ts");
const ayda = {
 id:"test-ayda",role:"freelancer",title:"Dijital Pazarlama & Marka Tasarımcısı",
 expertise:"Digital Marketing, Social Media Design, Performance Marketing, SEO, Content Marketing, Email Marketing, Growth Marketing, Brand Design, Grafik Tasarım, Visual Design, Design System, Product Design",
 skills:["Canva","Shopify","Figma","Adobe InDesign","Adobe Illustrator","Adobe Photoshop","Adobe XD","UI Design","UI/UX Design","Design System"],
 experience:"3-5 yıl",project_types:["Dijital Pazarlama","İçerik Üretimi","Diğer"],
};
const marketing = {...ayda,title:"Digital Marketing Specialist",expertise:"Digital Marketing, SEO, Performance Marketing",skills:["Performance optimization","React","API development"]};
function database(profile, roles, project = {}) {
 const record={id:"p",title:"Test project",category:"Web Tasarım",skills:["Performance optimization"],...project};
 return {
  from(table) {
   const data=table==="projects"?record:table==="profiles"?profile:[];
   const query={select(){return query},eq(){return query},order(){return query},maybeSingle(){return Promise.resolve({data,error:null})},then(resolve,reject){return Promise.resolve({data,error:null}).then(resolve,reject)}};
   return query;
  },
  rpc:async()=>({data:roles.map((role,i)=>typeof role==="string"?{role,roleId:"r"+i,requiredSkills:["Performance optimization"],budgetPerPerson:100}:role),error:null}),
 };
}
async function matches(profile, roles, project) {
 semanticCalls=0;
 semanticResult=null;
 return matcher.matchFreelancerToProjectRoles(database(profile,roles,project),"p",profile.id);
}
test("Ayda real declared specialties include marketing and design, never engineering",()=>{
 const families=taxonomy.detectRoleFamilies(taxonomy.freelancerFamilyText(ayda));
 assert.equal(families.has("marketing"),true);
 assert.equal(families.has("design"),true);
 assert.equal(families.has("development"),false);
});
test("Ayda rejects Backend and Frontend even with perfect shared skills",async()=>{
 const result=await matches({...ayda,skills:["Performance optimization","React","API development"]},["Backend Developer","Frontend Developer"]);
 assert.ok(result.every(m=>m.score===0&&!m.isEligibleForRole&&m.budgetPerPerson===undefined));
 assert.equal(taxonomy.selectBestEligibleRole(result),null);
 assert.equal(semanticCalls,0);
});
test("Marketing chooses Digital Marketing Specialist over Backend",async()=>{
 const result=await matches(marketing,["Backend Developer","Digital Marketing Specialist"]);
 assert.equal(taxonomy.selectBestEligibleRole(result)?.role,"Digital Marketing Specialist");
 assert.equal(result.find(m=>m.role==="Backend Developer").score,0);
});
test("Growth Marketer is a strongly related marketing role",async()=>{
 const result=await matches({...marketing,skills:[]},[{role:"Growth Marketer",requiredSkills:[]}],{skills:[]});
 assert.equal(result[0].isEligibleForRole,true);
 assert.ok(result[0].score>=65&&result[0].score<85);
});
for(const [title,expertise,target] of [
 ["UI/UX Designer","UI/UX Design","Backend Developer"],
 ["Brand Designer","Brand Design","Digital Marketing Specialist"],
 ["Digital Marketing Specialist","Marketing","Frontend Developer"],
]) test(title+" rejects "+target+" before shared skill boosts",async()=>{
 const result=await matches({...marketing,title,expertise},[target]);
 assert.equal(result[0].score,0);
 assert.equal(result[0].isEligibleForRole,false);
});
test("Backend to Frontend is explicitly related, never exact",async()=>{
 const result=await matches({...marketing,title:"Backend Developer",expertise:"Backend Developer",skills:[]},[{role:"Frontend Developer",requiredSkills:[],preferredSkills:[]}],{skills:[]});
 assert.equal(result[0].isEligibleForRole,true);
 assert.equal(result[0].relevance.level,"related");
 assert.ok(result[0].score>=40&&result[0].score<65);
});
for(const role of ["Screenwriter","Book Writer"]) test("Content Writer relates to "+role,async()=>{
 const result=await matches({...marketing,title:"Content Writer",expertise:"Content writing",skills:[]},[{role,requiredSkills:[]}],{skills:[]});
 assert.equal(result[0].isEligibleForRole,true);
 assert.ok(result[0].score>=40);
});
test("Unknown profile and role families fail closed",()=>{
 assert.equal(taxonomy.computeRoleEligibility(100,"Backend Developer","Freelancer").isEligibleForRole,false);
 assert.equal(taxonomy.computeRoleEligibility(100,"Unknown custom role","Digital Marketing Specialist").isEligibleForRole,false);
});
test("Tool tag cannot add an unrelated family to declared profession",()=>{
 const profile={title:"Marketing Specialist",expertise:"SEO",skills:["Backend Developer","Figma"]};
 assert.equal(taxonomy.computeRoleEligibility(100,"Backend Developer",taxonomy.freelancerFamilyText(profile)).familyCompatible,false);
});
test("No substring keyword leak from Seoul into SEO",()=>{
 assert.equal(taxonomy.detectRoleFamilies("Seoul photographer").has("marketing"),false);
});
test("Discover selects highest eligible score and ignores first ineligible fallback",()=>{
 const rows=[{role:"Backend",score:99,isEligibleForRole:false},{role:"Marketing",score:50,isEligibleForRole:true},{role:"Growth",score:60,isEligibleForRole:true}];
 assert.equal(taxonomy.selectBestEligibleRole(rows).role,"Growth");
 assert.equal(taxonomy.selectBestEligibleRole(rows.slice(0,1)),null);
});
test("No-role fallback checks project family before skill overlap",async()=>{
 const result=await matches(marketing,[],{category:"Architecture",skills:["AutoCAD","Performance optimization"]});
 assert.equal(result[0].score,0);
 assert.equal(result[0].isEligibleForRole,false);
});
test("AI verdict cannot bypass minimum score eligibility",async()=>{
 semanticResult=new Map([["SEO Specialist",{score:20,isMatch:true,reason:"unsafe low score"}]]);
 const result=await matcher.matchFreelancerToProjectRoles(database({...marketing,title:"Social Media Specialist",expertise:null,skills:[]},[{role:"SEO Specialist",requiredSkills:[]}],{skills:[]}),"p",marketing.id);
 assert.equal(result[0].isEligibleForRole,false);
 assert.equal(result[0].budgetPerPerson,undefined);
 semanticResult=null;
});
test("Client matching also rejects marketing for engineering",async()=>{
 const db=database(marketing,[]);
 db.from=()=>{const q={select(){return q},eq(){return q},order(){return q},then(resolve,reject){return Promise.resolve({data:[marketing],error:null}).then(resolve,reject)}};return q;};
 const result=await matcher.matchTalent(db,{category:"Yazılım",summary:"Test",skills:[]},[{name:"Backend Developer",skills:["Performance optimization"]}]);
 assert.equal(result[0].totalEligibleCount,0);
 assert.equal(result[0].freelancers.length,0);
});

if(process.env.MATCH_SNAPSHOT_PATH) test("Live Ayda profile and project role snapshot reject engineering",async()=>{
 const snapshot=JSON.parse(fs.readFileSync(process.env.MATCH_SNAPSHOT_PATH,"utf8").replace(/^\uFEFF/,""));
 const result=await matches(snapshot.profile,snapshot.project.roles,snapshot.project);
 for(const role of ["Backend Developer","Frontend Developer"]) {
  const match=result.find(item=>item.role===role);
  assert.equal(match.score,0);
  assert.equal(match.isEligibleForRole,false);
 }
 const best=taxonomy.selectBestEligibleRole(result);
 assert.ok(!best || best.role==="UI/UX Designer");
 console.log("Live snapshot replay:",JSON.stringify(result.map(({role,score,isEligibleForRole})=>({role,score,isEligibleForRole}))));
});

const relevance = load("lib/matching/roleRelevance.ts");
const auditPairs=[
 ["Digital Marketing Specialist","Digital Marketing Specialist","exact"],
 ["Digital Marketing Specialist","Performance Marketer","strong_related"],
 ["Digital Marketing Specialist","Growth Marketer","strong_related"],
 ["Social Media Specialist","SEO Specialist","related"],
 ["Brand Designer","Digital Marketing Specialist","adjacent"],
 ["Content Writer","Screenwriter","related"],
 ["Content Writer","Book Writer","related"],
 ["Screenwriter","Book Writer","related"],
 ["Copywriter","Content Writer","strong_related"],
 ["UX Writer","Technical Writer","related"],
 ["UI/UX Designer","Product Designer","strong_related"],
 ["UI/UX Designer","Web Designer","strong_related"],
 ["Brand Designer","Graphic Designer","strong_related"],
 ["Brand Designer","UI/UX Designer","adjacent"],
 ["Interior Designer","UI/UX Designer","unrelated"],
 ["Backend Developer","Full Stack Developer","strong_related"],
 ["Frontend Developer","Full Stack Developer","strong_related"],
 ["Backend Developer","Frontend Developer","related"],
 ["Backend Developer","DevOps Engineer","adjacent"],
 ["Frontend Developer","Mobile Developer","related"],
];
for(const [title,role,level] of auditPairs) {
 test("relevance taxonomy: "+title+" → "+role+" = "+level,()=>{
  const result=relevance.getRoleRelevance(role,[title]);
  assert.equal(result.level,level);
  const score=relevance.scoreRoleRelevance(result,100,100,100);
  const band=relevance.ROLE_SCORE_BANDS[level];
  assert.ok(score>=band.min&&score<=band.max);
 });
 test("matching band and no shared-skill override: "+title+" → "+role,async()=>{
  const profile={...marketing,title,expertise:null,skills:["Shared skill"],project_types:[]};
  const result=await matches(profile,[{role,requiredSkills:["Shared skill"]}],{skills:["Shared skill"]});
  const match=result[0],band=relevance.ROLE_SCORE_BANDS[level];
  assert.ok(match.score<=band.max);
  if(level==="adjacent"||level==="unrelated") {
   assert.equal(match.isEligibleForRole,false);
   assert.equal(taxonomy.selectBestEligibleRole(result),null);
  } else {
   assert.equal(match.isEligibleForRole,true);
   assert.ok(match.score>=band.min);
  }
 });
}
test("mixed Ayda specialties use the candidate's own marketing/design path",()=>{
 const marketingPath=relevance.getRoleRelevance("Digital Marketing Specialist",[ayda.title,ayda.expertise]);
 const designPath=relevance.getRoleRelevance("Brand Designer",[ayda.title,ayda.expertise]);
 const engineeringPath=relevance.getRoleRelevance("Backend Developer",[ayda.title,ayda.expertise]);
 assert.equal(marketingPath.matchedRole,"digital_marketing");
 assert.equal(marketingPath.family,"marketing");
 assert.equal(designPath.matchedRole,"brand_design");
 assert.equal(designPath.family,"design");
 assert.equal(engineeringPath.level,"unrelated");
});
test("adding brand specialty cannot improve marketing role score",async()=>{
 const base={...marketing,title:"Digital Marketing Specialist",expertise:"Digital Marketing",skills:["SEO"],project_types:[]};
 const roles=[{role:"Performance Marketer",requiredSkills:["Brand Design","Figma"]}];
 const without=await matches(base,roles,{skills:[]});
 const withBrand=await matches({...base,expertise:"Digital Marketing, Brand Design",skills:["SEO","Figma"]},roles,{skills:[]});
 assert.equal(withBrand[0].score,without[0].score);
});
test("AI score cannot promote related role into strong/exact bands",async()=>{
 semanticResult=new Map([["SEO Specialist",{score:99,isMatch:true,reason:"overconfident"}]]);
 const result=await matcher.matchFreelancerToProjectRoles(database({...marketing,title:"Social Media Specialist",expertise:null,skills:[]},[{role:"SEO Specialist",requiredSkills:[]}],{skills:[]}),"p",marketing.id);
 assert.ok(result[0].score<=64);
 assert.equal(result[0].relevance.level,"related");
 semanticResult=null;
});
test("adjacent roles never go to AI to become direct matches",async()=>{
 const result=await matches({...marketing,title:"Backend Developer",expertise:null,skills:["Shared skill"]},[{role:"DevOps Engineer",requiredSkills:["Shared skill"]}]);
 assert.equal(result[0].isEligibleForRole,false);
 assert.equal(semanticCalls,0);
});
test("title/expertise absence is not invented primary or secondary specialty",()=>{
 assert.equal(relevance.getRoleRelevance("Backend Developer",["Freelancer"]).level,"unrelated");
 assert.equal(relevance.getRoleRelevance("Brand Designer",["Digital Marketing Specialist","Brand Design"]).level,"exact");
});
test("Discover also rejects a wrongly eligible adjacent payload",()=>{
 assert.equal(taxonomy.selectBestEligibleRole([{score:99,isEligibleForRole:true,relevance:{level:"adjacent",roleScore:25}}]),null);
});

test("social media design does not manufacture a marketing specialty",()=>{
 const profile={title:"Brand Designer",expertise:"Social Media Design",skills:["Social Media"]};
 assert.equal(taxonomy.detectRoleFamilies(taxonomy.freelancerFamilyText(profile)).has("marketing"),false);
 assert.equal(relevance.getRoleRelevance("Social Media Specialist",[profile.expertise]).level,"unrelated");
});
test("compound spatial role is related to architect, not exact by substring",()=>{
 assert.equal(relevance.getRoleRelevance("Architect",["Interior Architect"]).level,"strong_related");
});
test("irrelevant design sub-family expertise cannot boost digital product support",async()=>{
 const base={...marketing,title:"UI/UX Designer",expertise:"UI/UX Design",skills:[]};
 const roles=[{role:"Product Designer",requiredSkills:["Brand Design"]}];
 const without=await matches(base,roles,{skills:[]});
 const withBrand=await matches({...base,expertise:"UI/UX Design, Brand Design"},roles,{skills:[]});
 assert.equal(withBrand[0].score,without[0].score);
});
