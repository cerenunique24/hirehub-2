import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("components/notifications/NotificationRows.tsx","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,module:{exports},require:name=>{
 if(name==="react/jsx-runtime")return jsx;
 if(name==="lucide-react")return new Proxy({},{get:()=>()=>React.createElement("svg")});
 if(name.includes("Button"))return {Button:props=>React.createElement("button",{onClick:props.onClick},props.children)};
 if(name.includes("PanelPrimitives"))return {PanelBadge:({children})=>React.createElement("span",null,children)};
 if(name.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})};
 throw Error(name);
}});
const base={id:"n",type:"project",title:"Gerçek başlık",message:"Gerçek açıklama",link:"/freelancers/projects/p",is_read:false,created_at:"2026-10-13T10:00:00Z"};
const props={getType:()=>"Proje",formatDate:value=>value,onOpen(){}};
const render=notification=>renderToStaticMarkup(React.createElement(exports.NotificationRows,{...props,notifications:[notification]}));
test("notification rows show actual title, message, timestamp and unread signal",()=>{const html=render(base);assert.ok(html.includes("Gerçek başlık"));assert.ok(html.includes("Gerçek açıklama"));assert.ok(html.includes('dateTime="'+base.created_at+'"'));assert.ok(html.includes('data-unread="true"'));assert.ok(html.includes('aria-label="Okunmamış"'));assert.ok(html.includes("Görüntüle"));});
test("read notifications without destination do not fabricate navigation actions",()=>{const html=render({...base,is_read:true,link:null,message:null});assert.ok(html.includes('data-unread="false"'));assert.equal(html.includes("Görüntüle"),false);assert.equal(html.includes("Okunmamış"),false);assert.equal(html.includes("Okundu işaretle"),false);});
test("unread notification without destination offers only real read action",()=>{const html=render({...base,link:null});assert.equal(html.includes("Görüntüle"),false);assert.ok(html.includes("Okundu işaretle"));});
test("notification action forwards original record to existing read/navigation handler",()=>{let received;const tree=exports.NotificationRows({...props,notifications:[base],onOpen:value=>received=value});const row=tree.props.children[0];row.props.children[2].props.onClick();assert.equal(received,base);});

test("Client notifications without type do not invent category metadata",()=>{const html=renderToStaticMarkup(React.createElement(exports.NotificationRows,{...props,getType:()=>"",notifications:[{...base,type:undefined}]}));assert.equal(html.includes("Proje"),false);assert.ok(html.includes("Gerçek başlık"));});
