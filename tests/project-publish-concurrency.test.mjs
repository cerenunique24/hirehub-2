import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
// Exercise the real handler under controlled request timing, with no project data or DB writes.
function handler() {
  const source=fs.readFileSync("app/client/create-project/page.tsx","utf8"),tree=ts.createSourceFile("page.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let fn;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==="publishProject")fn=n;ts.forEachChild(n,visit);}visit(tree);
  let calls=0,rejectPending;const states=[];
  const scope={publishInFlight:{current:false},budgetIsReady:true,setError(){},setPublishing:value=>states.push(value),console:{error(){}},supabase:{auth:{getUser:()=>{calls++;return new Promise((_,reject)=>{rejectPending=reject;});}}}};
  vm.createContext(scope);vm.runInContext(ts.transpileModule(fn.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,scope);
  return {run:()=>scope.publishProject(),calls:()=>calls,fail:()=>rejectPending(new Error("Transport failure")),states,locked:()=>scope.publishInFlight.current};
}
test("rapid repeat publish enters only one auth/database request chain",async()=>{const h=handler();const first=h.run();await h.run();assert.equal(h.calls(),1);assert.equal(h.locked(),true);h.fail();await first;assert.equal(h.locked(),false);assert.equal(h.states.at(-1),false);});
test("failed publish can retry without bypassing the in-flight guard",async()=>{const h=handler();const first=h.run();h.fail();await first;const retry=h.run();await h.run();assert.equal(h.calls(),2);h.fail();await retry;assert.equal(h.locked(),false);});
