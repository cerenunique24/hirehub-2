import { resolveProjectWorkflowState, type WorkflowMilestone } from "@/lib/projects/workflow-state";

export type CoalitionStage = WorkflowMilestone & {
 project_id: string;
 due_date: string | null;
 sort_order: number | null;
 submitted_at?: string | null;
 approved_at?: string | null;
 revision_requested_at?: string | null;
};
export type CoalitionProject = {
 id: string;
 title: string;
 status: string;
 deadline: string | null;
 team_required: boolean | null;
 updated_at?: string | null;
};
export function coalitionWork(project: CoalitionProject | null, stages: CoalitionStage[] | null, userId: string | null, memberIds: string[]) {
 if(!project) return {state:"Proje bağlantısı bulunmuyor",nextStep:"Proje bağlamını koalisyon detayından kontrol et.",actionOwner:"Bilgi yok",currentUserMustAct:false,currentStage:null as CoalitionStage|null,approved:0,total:0};
 if(stages===null) return {state:"Aşama bilgileri alınamadı",nextStep:"Sıradaki adımı çalışma alanından kontrol et.",actionOwner:"Doğrulanamadı",currentUserMustAct:false,currentStage:null as CoalitionStage|null,approved:0,total:0};
 const ordered=[...stages].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
 const workflow=resolveProjectWorkflowState({projectStatus:project.status,viewerRole:"freelancer",isTeamProject:project.team_required!==false,milestones:ordered,currentUserId:userId,teamMemberIds:memberIds});
 const own=project.team_required!==false?ordered.filter(stage=>stage.freelancer_id===userId):ordered;
 return {...workflow,currentStage:own.find(stage=>["revision","active","pending"].includes(stage.status))??own.find(stage=>stage.status!=="approved")??null,approved:ordered.filter(stage=>stage.status==="approved").length,total:ordered.length};
}
export function coalitionProjectHref(project: Pick<CoalitionProject,"id"|"status">) {
 return ["in_progress","completed"].includes(project.status) ? "/freelancers/projects/"+project.id : "/freelancers/discover/"+project.id;
}
export function coalitionProjectLabel(status: string) {
 return ({open:"Ekip kuruluyor",ready_to_start:"Ekip hazır · Başlamadı",in_progress:"Çalışma devam ediyor",completed:"Tamamlandı",paused:"Duraklatıldı",cancelled:"İptal edildi"} as Record<string,string>)[status]??"Tanımsız";
}
export function coalitionStageLabel(status: string) {
 return ({pending:"Bekliyor",active:"Çalışma devam ediyor",submitted:"İnceleme bekleniyor",in_review:"İnceleme bekleniyor",revision:"Revizyon bekliyor",approved:"Onaylandı"} as Record<string,string>)[status]??"Tanımsız";
}

export function coalitionActivity(createdAt: string, members: {id:string; joined_at:string; name:string}[], stages: CoalitionStage[] | null) {
 const events=[{id:"created",date:createdAt,text:"Koalisyon oluşturuldu"},...members.map(member=>({id:member.id,date:member.joined_at,text:member.name+" ekibe katıldı"}))];
 for(const stage of stages??[]) {
  for(const [kind,date,label] of [["submitted",stage.submitted_at,"Teslim yapıldı"],["revision",stage.revision_requested_at,"Revizyon istendi"],["approved",stage.approved_at,"Aşama onaylandı"]] as const) {
   if(date) events.push({id:stage.id+":"+kind,date,text:label+": "+stage.title});
  }
 }
 return events.filter(event=>Number.isFinite(Date.parse(event.date))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,5);
}

export function coalitionActionSummary(work: ReturnType<typeof coalitionWork>, project: CoalitionProject | null, stages: CoalitionStage[] | null) {
 if(!project || stages===null) return "Aksiyon bilgisi doğrulanamadı";
 if(work.currentUserMustAct) {
  if(!work.currentStage) return "Sıradaki: İlk aşamayı oluştur";
  return ({revision:"Sıradaki: Revizyon teslimi",active:"Sıradaki: Çalışmanı teslim et",pending:"Sıradaki: Aşamanı başlat"} as Record<string,string>)[work.currentStage.status] ?? work.state;
 }
 if(project.status==="in_progress" && (work.currentStage?.status==="submitted" || work.currentStage?.status==="in_review" || work.state==="Tüm aşamalar onaylandı")) return "Client onayı bekleniyor";
 return "Şu an senden aksiyon beklenmiyor";
}
export function coalitionCanAddStage(project: CoalitionProject | null, userId: string | null, memberIds: string[]) {
 return Boolean(project?.status==="in_progress" && project.team_required===true && userId && memberIds.includes(userId));
}

export function coalitionDetailSummary(work: ReturnType<typeof coalitionWork>, project: CoalitionProject | null, stages: CoalitionStage[] | null) {
 if(!project || stages===null) return {headline:"Durum doğrulanamadı",tone:"neutral" as const};
 if(work.state==="Tüm aşamalar onaylandı") return {headline:"Tüm aşamalar onaylandı",tone:"success" as const};
 if(work.currentUserMustAct) return {headline:work.currentStage?.status==="revision" ? "Revizyon gerekiyor" : coalitionActionSummary(work,project,stages),tone:work.currentStage?.status==="revision" ? "revision" as const : "info" as const};
 const summary=coalitionActionSummary(work,project,stages);
 return {headline:summary,tone:summary==="Client onayı bekleniyor" || project.status==="ready_to_start" ? "warning" as const : project.status==="completed" ? "success" as const : "neutral" as const};
}
