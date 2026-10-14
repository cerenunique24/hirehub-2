export function directoryReturnHref(coalitionId: string | null, search: string, category: string, page = 1) {
 const query=new URLSearchParams(); if(page>1)query.set("page",String(page)); if(coalitionId)query.set("coalitionId",coalitionId); if(search.trim())query.set("q",search); if(category!=="Tümü")query.set("category",category);
 return "/freelancers/freelancers"+(query.size?"?"+query.toString():"");
}
export function safeDirectoryReturn(value: string | null) {
 if(!value) return "/freelancers/freelancers";
 try { const url=new URL(value,"https://local.invalid"); return url.origin==="https://local.invalid" && url.pathname==="/freelancers/freelancers" ? url.pathname+url.search : "/freelancers/freelancers"; } catch { return "/freelancers/freelancers"; }
}
export function directoryAvailability(status?: string | null) { return ({available:"Müsait",limited:"Kısmen müsait",unavailable:"Müsait değil"} as Record<string,string>)[status??""]??"Müsaitlik belirtilmedi"; }
export function directorySkills(skills?: string[] | null) { const unique=[...new Set((skills??[]).map(skill=>skill.trim()).filter(Boolean))];return {visible:unique.slice(0,3),remaining:Math.max(0,unique.length-3)}; }

/** Slice the existing permission-filtered, searched and ranked result set. */
export function paginateDirectory<T>(items:readonly T[],requestedPage:number){const pageSize=20;const totalPages=Math.ceil(items.length/pageSize);const page=Math.min(Math.max(1,Number.isFinite(requestedPage)?Math.floor(requestedPage):1),Math.max(1,totalPages));const start=(page-1)*pageSize;return {items:items.slice(start,start+pageSize),page,totalPages,total:items.length,start,end:Math.min(start+pageSize,items.length)};}
export {paginationPageNumbers as directoryPageNumbers} from "../ui/paginationPresentation";
