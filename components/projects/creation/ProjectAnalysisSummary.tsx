"use client";
import type { ReactNode } from "react";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { ProjectTeamReview, UnassignedSkillNotice, type OptionalExpertise } from "./ProjectTeamReview";
import { usePremium } from "@/lib/hooks/usePremium";
import type { ProjectAnalysis } from "@/types/ai";
import type { PlusProjectAnalysis, ProProjectAnalysis } from "@/lib/ai/projectAnalysisEnrichment";
import styles from "./ProjectAnalysisSummary.module.css";
type EditableRole = { id?: string; reason?: string; name: string; skills: string[]; responsibilities: string[]; memberCount?: number };
const unique = (items: string[]) => [...new Map(items.filter(item=>item.trim()).map(item => [item.trim().toLocaleLowerCase("tr-TR"), item.trim()])).values()];
/** Coverage describes current editable roles, not project quality or match confidence. */
export function analysisCoverage(analysis: ProjectAnalysis, roles: EditableRole[]) {
  const required = unique([...(analysis.requiredSkills ?? []), ...(analysis.roleDetails ?? []).flatMap(role => role.requiredSkills ?? [])]);
  const assigned = new Set(unique(roles.flatMap(role => role.skills)).map(skill => skill.toLocaleLowerCase("tr-TR")));
  const missing = required.filter(skill => !assigned.has(skill.toLocaleLowerCase("tr-TR")));
  return { required, missing, covered: required.length - missing.length };
}
export function ProjectAnalysisSummary({ analysis, roles, proAnalysis, canUseDeepAnalysis, onAssignSkill, onAddOptionalRole, recommendations }: {
  analysis: ProjectAnalysis; roles: EditableRole[]; advancedAnalysis: PlusProjectAnalysis | null; proAnalysis: ProProjectAnalysis | null;
  aiUsage: { count: number; monthlyLimit: number; limitReached: boolean } | null; canUseDeepAnalysis: boolean; onReviewRoles: () => void; onAssignSkill?: (skill:string,roleId:string)=>void; onAddOptionalRole?: (suggestion:OptionalExpertise)=>void; recommendations?: ReactNode;
}) {
  const { can, loading } = usePremium();
  const plus = !loading && can("advanced_project_analysis");
  const pro = plus && canUseDeepAnalysis && can("advanced_matching_client") ? proAnalysis : null;

  const coverage = analysisCoverage(analysis, roles);
  const responsibilities = unique((analysis.roleDetails ?? []).flatMap(role => role.responsibilities ?? []));
  const suggestions = unique([...(analysis.recommendations ?? []), ...(pro?.advancedRecommendations ?? [])]);
  const risk = pro && pro.riskAnalysis.level !== "low" ? pro.riskAnalysis.risks.find(item => item.trim()) : undefined;
  const attentionPoints = unique(analysis.considerations ?? []);
  const attention = risk || attentionPoints[0];
  const decisionSummary = analysis.summary?.trim() || (analysis.roleDetails ?? []).map(role => role.reason?.trim()).filter(Boolean).join(" ");

  return <section className={styles.root} aria-label="Colla AI proje analizi">
    <header className={styles.summary}>
      <p className={styles.label}><Sparkles size={16} aria-hidden="true"/> Colla AI analizi</p>
      <h3 className={styles.headline}>{roles.length === 1 && roles[0].name.trim() ? <>Bu proje için tek bir <span>{roles[0].name}</span> yeterli görünüyor.</> : roles.length > 1 ? <>Bu proje için <span>{roles.length} rolden oluşan</span> bir ekip öneriyoruz.</> : "Projenin ihtiyaçları analiz edildi."}</h3>
      {decisionSummary && <p className={styles.description}>{decisionSummary}</p>}
      {!plus && <ul className={styles.signals} aria-label="AI analizinden çıkan bilgiler">
        <li><strong>{analysis.roleDetails?.length ?? 0}</strong><span>Önerilen rol</span></li><li><strong>{coverage.covered}/{coverage.required.length}</strong><span>Temel beceri</span></li><li><strong>{responsibilities.length}</strong><span>Sorumluluk</span></li>
      </ul>}
    </header>
    <ProjectTeamReview accessLoading={loading} analysis={analysis} roles={roles} coverage={coverage} plus={plus} pro={Boolean(pro)} risk={risk} attention={attentionPoints} suggestions={suggestions} onAssign={onAssignSkill} onAdd={onAddOptionalRole}/>
    {!plus && coverage.missing.length>0 && <UnassignedSkillNotice missing={coverage.missing} roles={roles} onAssign={onAssignSkill}/>}
    {!plus && coverage.missing.length===0 && attention && <aside className={styles.attention} aria-label="Dikkat noktası"><AlertTriangle size={18} aria-hidden="true"/><p>{attention}</p></aside>}
    <section className={styles.coverage} aria-label="Beceri kapsamı">
      {coverage.required.length > 0 && coverage.missing.length === 0 ? <p className={styles.complete}><Check size={16} aria-hidden="true"/> Tüm temel beceriler karşılanıyor</p> : <>
        <div className={styles.coverageHeading}><h3>Beceri kapsamı</h3>{coverage.required.length > 0 && <strong>{coverage.covered} / {coverage.required.length}</strong>}</div>
        {coverage.required.length > 0 ? <meter className={styles.coverageIndicator} min={0} max={coverage.required.length} value={coverage.covered} aria-label="Önerilen becerilerin rol tanımlarındaki kapsamı"/> : <p>Beceri önerisi bulunmuyor</p>}
      </>}
    </section>
    {recommendations}

  </section>;
}
