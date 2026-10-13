export function directoryReturnHref(coalitionId: string | null, search: string, category: string) {
 const query=new URLSearchParams(); if(coalitionId)query.set("coalitionId",coalitionId); if(search.trim())query.set("q",search); if(category!=="Tümü")query.set("category",category);
 return "/freelancers/freelancers"+(query.size?"?"+query.toString():"");
}
export function safeDirectoryReturn(value: string | null) {
 if(!value) return "/freelancers/freelancers";
 try { const url=new URL(value,"https://local.invalid"); return url.origin==="https://local.invalid" && url.pathname==="/freelancers/freelancers" ? url.pathname+url.search : "/freelancers/freelancers"; } catch { return "/freelancers/freelancers"; }
}
export function directoryAvailability(status?: string | null) { return ({available:"Müsait",limited:"Kısmen müsait",unavailable:"Müsait değil"} as Record<string,string>)[status??""]??"Müsaitlik belirtilmedi"; }
export function directorySkills(skills?: string[] | null) { const unique=[...new Set((skills??[]).map(skill=>skill.trim()).filter(Boolean))];return {visible:unique.slice(0,3),remaining:Math.max(0,unique.length-3)}; }
