import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsx from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";
function compile(path,require=()=>({})) {const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,module:{exports},require,URL,URLSearchParams,Intl});return exports;}
const presentation=compile("components/freelancers/directoryPresentation.ts");
test("directory skill summary deduplicates, limits to three and counts the rest",()=>{
 const result=presentation.directorySkills(["Figma","Figma"," React ","CSS","TypeScript","SEO","", "HTML"]);
 assert.equal(result.visible.join(","),"Figma,React,CSS");assert.equal(result.remaining,3);assert.equal(presentation.directorySkills(null).visible.length,0);
});
test("availability renders real states and leaves absent values unknown",()=>{
 for(const [state,label] of [["available","Müsait"],["limited","Kısmen müsait"],["unavailable","Müsait değil"],[null,"Müsaitlik belirtilmedi"],["unknown","Müsaitlik belirtilmedi"]])assert.equal(presentation.directoryAvailability(state),label);
});
test("profile back navigation preserves filters and coalition without accepting external targets",()=>{
 const href=presentation.directoryReturnHref("crew","Figma & UX","Tasarım");
 const url=new URL(href,"https://local.invalid");assert.equal(url.searchParams.get("q"),"Figma & UX");assert.equal(url.searchParams.get("coalitionId"),"crew");assert.equal(url.searchParams.get("category"),"Tasarım");assert.equal(presentation.safeDirectoryReturn(href),href);
 for(const href of ["https://evil.example","//evil.example/freelancers/freelancers","/client/dashboard",null])assert.equal(presentation.safeDirectoryReturn(href),"/freelancers/freelancers");
});
const normalizeDirectory=compile("lib/utils/normalizeStringArray.ts");
const Card=compile("components/freelancers/DirectoryFreelancerCard.tsx",request=>{
 if(request==="react/jsx-runtime")return jsx;
 if(request==="next/link")return {default:({children,...props})=>React.createElement("a",props,children),__esModule:true};
 if(request==="./ProfileAvatar")return {ProfileAvatar:({name})=>React.createElement("span",null,name.slice(0,1))};
 if(request==="./directoryPresentation")return presentation;
 if(request.includes("RatingSummary"))return {__esModule:true,default:()=>React.createElement("span",null,"Henüz değerlendirme yok")};
 if(request.includes("normalizeStringArray"))return normalizeDirectory;
 if(request.includes("displayName"))return {publicDisplayName:(p,f)=>p.first_name||f};
 if(request.includes("Button"))return {buttonClasses:()=>"profile-cta"};
 if(request.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_,k)=>String(k)})};
 throw Error(request);
}).DirectoryFreelancerCard;
test("directory card uses real data without invented scores or reviews",()=>{
 const html=renderToStaticMarkup(React.createElement(Card,{profile:{id:"p",first_name:"Ada",title:"Designer",skills:["Figma"],hourly_rate:500,availability_status:"available"},returnTo:"/freelancers/freelancers"}));
 assert.ok(html.includes("Profili İncele"));assert.ok(html.includes("Müsait"));assert.ok(html.includes("Designer"));assert.ok(html.includes("/freelancers/p?returnTo="));assert.equal(html.includes("eşleşme"),false);assert.ok(html.includes("Henüz değerlendirme yok"));
});
test("missing data and long titles remain profile content without fake price",()=>{
 const html=renderToStaticMarkup(React.createElement(Card,{profile:{id:"p",first_name:"Çok uzun bir freelancer adı",title:"Çok uzun bir uzmanlık başlığı ve çeşitli beceriler",hourly_rate:null,skills:null},returnTo:"/freelancers/freelancers"}));assert.ok(html.includes("Çok uzun bir uzmanlık"));assert.ok(html.includes("Müsaitlik belirtilmedi"));assert.equal(html.includes("Saatlik ücret"),false);
});

const normalize=compile("lib/utils/normalizeStringArray.ts");
const ProfileView=compile("components/freelancers/FreelancerProfileView.tsx",request=>{
 if(request==="react")return React;
 if(request==="react/jsx-runtime")return jsx;
 if(request==="next/link")return {default:({children,...props})=>React.createElement("a",props,children),__esModule:true};
 if(request==="next/image")return {default:props=>React.createElement("img",{src:props.src,alt:props.alt}),__esModule:true};
 if(request==="lucide-react")return new Proxy({},{get:()=>()=>React.createElement("svg")});
 if(request==="./ProfileAvatar")return {ProfileAvatar:({name})=>React.createElement("span",null,name.slice(0,1))};
 if(request==="./directoryPresentation")return presentation;
 if(request.includes("normalizeStringArray"))return normalize;
 if(request.includes("displayName"))return {publicDisplayName:(p,f)=>p.first_name||f};
 if(request.includes("Button"))return {buttonClasses:()=>"cta"};
 if(request.includes("PanelPrimitives"))return {panelRootClass:"panel"};
 if(request==="./ProfileReviews")return {ProfileReviews:()=>React.createElement("section",{id:"reviews"},"Yorumlar")};
 if(request.includes("RatingSummary"))return {__esModule:true,default:()=>React.createElement("span",null,"Henüz değerlendirme yok")};
 if(request.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_,k)=>String(k)})};
 throw Error(request);
}).FreelancerProfileView;
const baseProfile={id:"p",first_name:"Ada",avatar_url:null,title:"Designer",bio:null,expertise:null,skills:null,availability_status:null,experience:null,hourly_rate:null,city:null};
const renderProfile=props=>renderToStaticMarkup(React.createElement(ProfileView,{profile:baseProfile,portfolio:[],experiences:[],portfolioError:false,experienceError:false,returnTo:"/freelancers/freelancers",...props}));
test("professional profile offers progressive disclosure for long bio and many skills",()=>{
 const html=renderProfile({profile:{...baseProfile,bio:"a".repeat(900),skills:Array.from({length:10},(_,i)=>"skill-"+i)}});
 assert.ok(html.includes("Devamını göster"));assert.ok(html.includes("Tüm yetenekleri göster · 10"));assert.equal(html.includes("skill-9"),false);assert.equal(html.includes("a".repeat(900)),false);assert.ok(html.includes('aria-expanded="false"'));
});
test("profile specialties normalize existing text instead of inventing a role family",()=>{
 const html=renderProfile({profile:{...baseProfile,expertise:'["Brand Design","UI Design"]'}});
 assert.ok(html.includes("Brand Design · UI Design"));assert.equal(html.includes('[&quot;Brand'),false);
});
test("profile portfolio has a meaningful visual fallback and safe external links",()=>{
 const html=renderProfile({portfolio:[{id:"w",title:"Real work",category:"Branding",description:"Real description",image_url:null,project_url:"https://portfolio.example/work"}]});
 assert.ok(html.includes("Real work"));assert.ok(html.includes("Branding"));assert.ok(html.includes("Portfolyoyu Gör"));assert.ok(html.includes('rel="noopener noreferrer"'));
 const unsafe=renderProfile({portfolio:[{id:"w",title:"Work",image_url:null,project_url:"javascript:alert(1)"}]});assert.equal(unsafe.includes("javascript:"),false);
});
test("profile without action permissions never fabricates invitation or message CTA",()=>{
 const html=renderProfile({});assert.equal(html.includes("Projeye Davet Et"),false);assert.equal(html.includes("Mesaj Gönder"),false);assert.equal(html.includes("eşleşme"),false);assert.equal(html.includes("doğrulanmış"),false);assert.ok(html.includes("Müsaitlik belirtilmedi"));assert.ok(html.includes("Henüz çalışma örneği paylaşılmamış"));
});
test("profile displays actual work history and separates unavailable data from empty data",()=>{
 const html=renderProfile({experiences:[{id:"e",company_name:"Studio",position:"Designer",description:"Brand projects",start_date:"2024-01-01",end_date:null}]});assert.ok(html.includes("Studio"));assert.ok(html.includes("Brand projects"));
 const error=renderProfile({portfolioError:true,experienceError:true});assert.ok(error.includes("Portföy yüklenemedi"));assert.ok(error.includes("Deneyim kayıtları yüklenemedi"));assert.equal(error.includes("Henüz çalışma örneği paylaşılmamış"),false);
});

const reviewsPresentation=compile("components/freelancers/reviewPresentation.ts");
test("rating summary parses real RPC values and never fabricates zero or invalid ratings",()=>{
 const result=reviewsPresentation.parseProfileRating([{rating_avg:4.75,rating_count:24}]);assert.equal(result.average,4.75);assert.equal(result.count,24);
 for(const data of [null,[],{rating_avg:null,rating_count:0},{rating_avg:9,rating_count:5},{rating_avg:4.8,rating_count:-1}])assert.equal(reviewsPresentation.parseProfileRating(data),null);
});
const Reviews=compile("components/freelancers/ProfileReviews.tsx",request=>{if(request==="react")return React;if(request==="react/jsx-runtime")return jsx;if(request==="./ProfileAvatar")return {ProfileAvatar:({src,name,className})=>React.createElement("span",{className},src?React.createElement("img",{src,alt:""}):name.slice(0,1))};if(request.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_,k)=>String(k)})};throw Error(request);}).ProfileReviews;
const renderReviews=props=>renderToStaticMarkup(React.createElement(Reviews,{reviews:[],rating:null,failed:false,loading:false,hasMore:false,onLoadMore(){},...props}));
test("reviews render actual author, project, date, rating and comment",()=>{
 const html=renderReviews({rating:{average:4.8,count:24},reviews:[{id:"r",project_id:"p",reviewer_id:"c",rating:5,comment:"Gerçek müşteri yorumu",created_at:"2026-10-13",reviewerName:"Deniz",projectTitle:"Marka projesi"}],hasMore:true});
 for(const text of ["4.8","24 değerlendirme","Deniz","Marka projesi","Gerçek müşteri yorumu","5/5","Daha fazla yorum"])assert.ok(html.includes(text));assert.ok(html.includes('dateTime="2026-10-13"'));
});
test("review empty, inaccessible and loading states are distinct",()=>{
 assert.ok(renderReviews({}).includes("Henüz değerlendirme yok"));const error=renderReviews({failed:true});assert.ok(error.includes("Değerlendirmeler yüklenemedi"));assert.equal(error.includes("Henüz değerlendirme yok"),false);assert.ok(renderReviews({loading:true}).includes("yükleniyor"));
});
test("profile uses editorial sections instead of tab-like navigation",()=>{
 const html=renderProfile({});assert.equal(html.includes('aria-label="Profil bölümleri"'),false);assert.ok(html.includes('id="reviews"'));assert.equal(html.includes('role="tab"'),false);
});

test("evaluation workspace starts with four portfolio samples and six skills",()=>{
 const portfolio=Array.from({length:7},(_,i)=>({id:"w"+i,title:"Work-"+i,image_url:null,project_url:null,category:"Design",description:null}));
 const html=renderProfile({portfolio,profile:{...baseProfile,skills:Array.from({length:9},(_,i)=>"skill-"+i)}});
 assert.ok(html.includes("Work-3"));assert.equal(html.includes("Work-4"),false);assert.ok(html.includes("Tüm portfolyoyu gör"));assert.ok(html.includes("skill-5"));assert.equal(html.includes("skill-6"),false);assert.ok(html.includes('aria-label="Uzmanlık ve çalışma bilgileri"'));
});
test("evaluation workspace limits initial experience and keeps section order",()=>{
 const experiences=Array.from({length:5},(_,i)=>({id:"e"+i,position:"Position-"+i,company_name:"Studio",start_date:null,end_date:null,description:null}));
 const html=renderProfile({experiences});assert.ok(html.includes("Position-2"));assert.equal(html.includes("Position-3"),false);assert.ok(html.includes("Daha fazla deneyim göster"));
 assert.ok(html.indexOf('id="about"')<html.indexOf('id="portfolio"'));assert.ok(html.indexOf('id="portfolio"')<html.indexOf('id="experience"'));assert.ok(html.indexOf('id="experience"')<html.indexOf('id="reviews"'));
});

test("profile rating and permitted CTA belong to full-width header, not supporting column",()=>{
 const html=renderProfile({reviewState:{reviews:[],rating:{average:4.8,count:24},failed:false,loading:false,hasMore:false,loadMore(){}},inviteAction:React.createElement("button",null,"Projeye Davet Et"),messageHref:"/client/messages?user=p"});
 const header=html.slice(html.indexOf("<header"),html.indexOf("</header>"));assert.ok(header.includes("4.8"));assert.ok(header.includes("24 değerlendirme"));assert.ok(header.includes("Projeye Davet Et"));assert.ok(header.includes("Mesaj Gönder"));assert.ok(header.includes("Müsaitlik belirtilmedi"));
 const aside=html.slice(html.indexOf("<aside"));assert.equal(aside.includes("Projeye Davet Et"),false);assert.equal(aside.includes("24 değerlendirme"),false);
});
test("profile stylesheet has no sticky or internal scroll and header spans content grid",()=>{
 const css=fs.readFileSync("components/freelancers/FreelancerProfile.module.css","utf8");assert.equal(/position:\s*sticky/.test(css),false);assert.equal(/overflow-y:\s*(auto|scroll)/.test(css),false);assert.ok(css.includes('"header header"'));assert.ok(css.includes("clamp(360px,35cqi,420px)"));
});


test("review cards show real avatar and use identity fallback without inventing a reviewer",()=>{
 const review={id:"r",project_id:"p",reviewer_id:"c",rating:4,comment:"İyi bir çalışma",created_at:"2026-10-13",reviewerName:"Deniz",reviewerAvatar:"https://images.example/deniz.png"};
 const html=renderReviews({reviews:[review]});assert.ok(html.includes('src="https://images.example/deniz.png"'));assert.ok(html.includes('class="reviewCard"'));assert.ok(html.includes('aria-label="4 / 5 yıldız"'));
 const fallback=renderReviews({reviews:[{...review,reviewerName:null,reviewerAvatar:null,projectTitle:null}]});assert.ok(fallback.includes("Değerlendiren kullanıcı"));assert.equal(fallback.includes("<img"),false);
});

test("long and multiline reviews offer disclosure while short reviews stay compact",()=>{
 const review={id:"r",project_id:"p",reviewer_id:"c",rating:5,created_at:"2026-10-13"};
 for(const comment of ["Uzun yorum ".repeat(60),"a\nb\nc\nd\ne"]){const html=renderReviews({reviews:[{...review,comment}]});assert.ok(html.includes("Devamını göster"));assert.ok(html.includes('aria-expanded="false"'));}
 assert.equal(renderReviews({reviews:[{...review,comment:"Kısa yorum"}]}).includes("Devamını göster"),false);
});

test("review loading and empty states explain what users are seeing",()=>{
 const empty=renderReviews({});assert.ok(empty.includes("tamamlanan projelerden sonra"));assert.equal(empty.includes("reviewAverage"),false);
 const loading=renderReviews({loading:true});assert.ok(loading.includes('aria-busy="true"'));assert.ok(loading.includes('role="status"'));assert.equal(loading.includes("Henüz değerlendirme yok"),false);assert.equal(loading.includes("reviewCard"),false);
});
