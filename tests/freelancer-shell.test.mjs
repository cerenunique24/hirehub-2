import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";
function compile(path,require){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,module:{exports},require});return exports;}
test("route scroll reset affects only the shared main viewport",()=>{
 const calls=[],effects=[],ref={current:{scrollTo:options=>calls.push(options)}};let pathname="/freelancers/projects";
 const View=compile("components/layout/AppViewport.tsx",name=>{
  if(name==="react")return {useRef:()=>ref,useEffect:(callback,deps)=>effects.push({callback,deps})};
  if(name==="react/jsx-runtime")return jsx;
  if(name==="next/navigation")return {usePathname:()=>pathname};
  if(name.includes("MobileSidebarContext"))return {useMobileSidebar:()=>({open:false})};
  if(name.includes("PageContainer"))return {__esModule:true,default:({children})=>React.createElement("div",null,children)};
  if(name.endsWith(".css"))return {__esModule:true,default:{viewport:"viewport"}};
  throw Error(name);
 }).default;
 let tree=View({children:"Module"});
 assert.equal(tree.type,"main");assert.equal(tree.props.ref,ref);assert.equal(tree.props["data-freelancer-viewport"],true);
 effects[0].callback();assert.equal(calls.length,1);assert.equal(calls[0].top,0);
 pathname="/freelancers/messages";View({children:"Messages"});effects[1].callback();assert.equal(calls.length,2);assert.equal(effects[1].deps[0],pathname);
});
test("actual Freelancer sidebar keeps all module links inside nav and footer outside",()=>{
 let menu;const Freelancer=compile("app/freelancers/components/Sidebar.tsx",name=>{
  if(name==="react/jsx-runtime")return jsx;
  if(name==="lucide-react")return new Proxy({},{get:()=>()=>React.createElement("svg")});
  if(name.includes("layout/Sidebar"))return {Sidebar:props=>{menu=props;return React.createElement("div");}};
  throw Error(name);
 }).default;
 renderToStaticMarkup(React.createElement(Freelancer));
 assert.equal(menu.menuGroups.flat().length,14);
 const state=[true,true,true,"Alex",null];let cursor=0;
 const Sidebar=compile("components/layout/Sidebar.tsx",name=>{
  if(name==="react")return {useMemo:fn=>fn(),useEffect(){},useState:initial=>[state[cursor++]??initial,()=>{}]};
  if(name==="react/jsx-runtime")return jsx;
  if(name==="next/link")return {__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};
  if(name==="next/image")return {__esModule:true,default:()=>React.createElement("img")};
  if(name==="next/navigation")return {usePathname:()=>"/freelancers/profile",useRouter:()=>({})};
  if(name==="lucide-react")return new Proxy({},{get:()=>()=>React.createElement("svg")});
  if(name.includes("supabase/client"))return {createClient:()=>({})};
  if(name.includes("useSidebarCounts"))return {useSidebarCounts:()=>({unreadNotifications:0,unreadMessages:0,pendingProposals:0})};
  if(name.includes("MobileSidebarContext"))return {useMobileSidebar:()=>({open:false,setOpen(){}})};
  if(name.includes("Avatar"))return {Avatar:()=>React.createElement("span")};
  if(name.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
  throw Error(name);
 }).Sidebar;
 const html=renderToStaticMarkup(Sidebar(menu)),nav=html.slice(html.indexOf("<nav"),html.indexOf("</nav>"));
 for(const item of menu.menuGroups.flat())assert.ok(nav.includes('href="'+item.href+'"'),item.name);
 assert.ok(nav.includes('tabindex="0"'));assert.ok(nav.includes('aria-current="page"'));assert.equal(nav.includes("Çıkış Yap"),false);
 assert.ok(html.indexOf("Çıkış Yap")>html.indexOf("</nav>"));
 assert.equal(nav.includes("overflow-hidden"),false);
});
