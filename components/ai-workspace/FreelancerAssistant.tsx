"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Compass, FileText, Sparkles, UserRound, ScanSearch } from "lucide-react";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { AI_CAPABILITIES, capabilityFor, type AIIntent, type AIOptions } from "@/lib/ai/assistantContracts";
import type { FreelancerWorkspace, FreelancerRecommendation } from "@/lib/ai/workspace";
import type { FreelancerRoleMatch } from "@/lib/ai/match-talent";
import type { ProfileAnalysis } from "@/lib/analytics/profileInsights";
import type { ProposalPerformance } from "@/lib/analytics/proposalPerformance";
import styles from "./FreelancerAssistant.module.css";

type Performance = {
  profileAnalysis: ProfileAnalysis;
  proposalPerformance: ProposalPerformance;
  competitionInsights: { projectId: string; totalProposals: number; avgBidAmount: number | null; myBidAmount: number | null; cheaperThanMe: number }[] | null;
  advancedProfileInsights: { myHourlyRate: number | null; marketAverageHourlyRate: number | null; sampleSize: number } | null;
};
type Result =
  | { kind: "matching"; intent: AIIntent; data: FreelancerWorkspace }
  | { kind: "performance"; intent: AIIntent; data: Performance }
  | { kind: "project"; intent: AIIntent; projectId: string; projectTitle: string; data: FreelancerRoleMatch[] }
  | { kind: "alerts"; intent: AIIntent; data: FreelancerRecommendation[] };
const ICONS = [Compass, FileText, UserRound, ScanSearch];
const CACHE_AGE = 5 * 60 * 1000;

export function FreelancerAssistant({ workspace, loading, error, onRetry }: {
  workspace: AIOptions | null; loading: boolean; error: string; onRetry: () => void;
}) {
  const [projects, setProjects] = useState({ proposal: "", project: "" });
  const [busy, setBusy] = useState<AIIntent | null>(null);
  const [requestError, setRequestError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [matches, setMatches] = useState<FreelancerWorkspace | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [alerts, setAlerts] = useState<FreelancerRecommendation[] | null>(null);
  const cache = useRef(new Map<string, { at: number; value: unknown }>());
  const abort = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(async (intent: AIIntent) => {
    if (workspace?.capabilities.find(item => item.id === intent)?.allowed !== true || lock.current) return;
    const projectId = projects.project;
    if (intent === "project" && !projectId) return;
    lock.current = true;
    setBusy(intent); setRequestError(""); setResult(null);
    const controller = new AbortController(); abort.current = controller;
    const url = intent === "matching" || intent === "advanced-matching"
      ? "/api/ai/freelancer-workspace?tool=" + intent
      : intent === "project" ? "/api/ai/match-talent"
      : intent === "alerts" ? "/api/premium/recommended-projects" : "/api/premium/performance";
    const key = url + (intent === "project" ? ":" + projectId : "");
    try {
      const existing = cache.current.get(key);
      let data: unknown;
      if (existing && Date.now() - existing.at < CACHE_AGE) data = existing.value;
      else {
        const response = await fetch(url, {
          signal: controller.signal,
          ...(intent === "project" ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) } : {}),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Analiz tamamlanamadı.");
        data = payload;
        if (!controller.signal.aborted) cache.current.set(key, { at: Date.now(), value: data });
      }
      if (controller.signal.aborted) return;
      if (intent === "matching" || intent === "advanced-matching") {
        const value = data as FreelancerWorkspace; setMatches(value); setResult({ kind: "matching", intent, data: value });
      } else if (intent === "project") {
        setResult({ kind: "project", intent, projectId, projectTitle: workspace?.projects.find(item => item.id === projectId)?.title ?? "Seçilen proje", data: (data as { matching: FreelancerRoleMatch[] }).matching });
      } else if (intent === "alerts") {
        const value = (data as { recommendations: FreelancerRecommendation[] }).recommendations;
        setAlerts(value); setResult({ kind: "alerts", intent, data: value });
      } else {
        const value = data as Performance; setPerformance(value); setResult({ kind: "performance", intent, data: value });
      }
    } catch (err) {
      if (!controller.signal.aborted) setRequestError(err instanceof Error ? err.message : "Analiz tamamlanamadı.");
    } finally {
      lock.current = false;
      if (!controller.signal.aborted) setBusy(null);
    }
  }, [workspace, projects.project]);

  function action(id: AIIntent, compact = false) {
    const capability = capabilityFor(id)!;
    const access = workspace?.capabilities.find(item => item.id === id);
    if (!access) return null;
    if (!access.allowed) return <Link className={styles.upgrade} href="/premium">{access.requiredPlan === "pro" ? "Pro" : "Plus"} planını incele <ArrowUpRight size={14} aria-hidden /></Link>;
    if (id === "proposal") return projects.proposal
      ? <Link className={styles.primary} href={"/freelancers/discover/" + encodeURIComponent(projects.proposal)}>{capability.cta}<ArrowUpRight size={16} aria-hidden /></Link>
      : <span className={styles.hint}>Başlamak için bir proje seç.</span>;
    return <button className={compact ? styles.secondary : styles.primary} disabled={busy !== null || id === "project" && !projects.project} onClick={() => void run(id)}>{busy === id ? "Hazırlanıyor…" : capability.cta}</button>;
  }

  const profileSuggestion = performance?.profileAnalysis.insights.find(item => item.suggestion)?.suggestion;
  const stats = performance?.proposalPerformance;
  const briefing = [
    { label: "Profil", text: profileSuggestion ?? (workspace?.briefing.profileCompletion != null ? "Profil doluluğun %" + workspace.briefing.profileCompletion + ". Geliştirme fırsatlarını Profil Koçu ile incele." : "Profil geliştirme fırsatlarını Profil Koçu ile incele.") },
    { label: "Eşleşme", text: matches ? matches.summary.suitableProjects + " uygun proje; " + matches.summary.strongMatches + " güçlü eşleşme. Rol nedenlerini analiz sonuçlarından incele." : "Uygun proje ve rol nedenlerini görmek için eşleşme analizini başlat." },
    { label: "Teklif", text: stats?.hasData ? stats.allTime.sent + " teklifinden " + stats.allTime.responded + " tanesi yanıtlandı, " + stats.allTime.accepted + " tanesi kabul edildi." : workspace?.briefing.proposalCount ? workspace.briefing.proposalCount + " teklif kaydın var. Yanıt ve kabul durumlarını performans aracında incele." : "Henüz teklif kaydın yok. Bir proje seçerek teklif akışını açabilirsin." },
    { label: "Smart Alert", text: alerts ? alerts.length ? alerts.length + " açık proje önerisi bulundu. Uygun rollerini incele." : "Mevcut verilerle uygun proje önerisi bulunamadı." : "Profiline ve başvuru geçmişine göre fırsatları bulmak için Smart Project Alerts'i çalıştır." },
  ];

  return <main className={panelRootClass + " " + styles.page}>
    <div className={styles.topbar}><h1><Sparkles size={20} aria-hidden /> CollaCrew AI</h1>{workspace && <span className={styles.badge}>{workspace.plan === "pro" ? "Pro" : workspace.plan === "plus" ? "Plus" : "Free"}</span>}</div>
    <header className={styles.hero}><div className={styles.heroCopy}><h2>Daha iyi projeler,<br /><span>daha güçlü teklifler.</span></h2><p>Profil, proje, teklif ve eşleşme verilerini birlikte değerlendir. İşine uygun aracı seç, bir sonraki adımını netleştir.</p></div><div className={styles.heroArt} aria-hidden="true"><Image src="/images/mascots/ai-lightbulb.png" alt="" width={220} height={209} sizes="(max-width: 639px) 96px, 220px" preload /></div></header>
    {loading ? <section role="status" aria-label="AI araçları yükleniyor" className={styles.skeleton}><span /><span /><span /><span /><p>AI çalışma alanın yükleniyor…</p></section>
      : error ? <section role="alert" className={styles.error}><p>{error}</p><button className={styles.secondary} onClick={onRetry}>Tekrar dene</button></section>
      : workspace && <>
        <section aria-labelledby="tools-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>BAĞLAMA ÖZEL ÇALIŞMA MERKEZİN</p><h2 id="tools-heading">AI Araçları</h2></div><p>Bir araç, net bir amaç.</p></div>
          <div className={styles.tools}>{AI_CAPABILITIES.slice(0, 4).map((item, index) => {
            const Icon = ICONS[index]; const access = workspace.capabilities.find(c => c.id === item.id)!;
            const projectTool = item.id === "proposal" || item.id === "project";
            return <article className={styles.tool} key={item.id}><div className={styles.toolTop}><Icon size={22} aria-hidden /><span className={styles.badge}>{access.requiredPlan === "pro" ? "Pro" : "Plus"}{access.allowed ? " · Dahil" : ""}</span></div><h3>{item.label}</h3><p>{item.description}</p>
              {projectTool && access.allowed && <label className={styles.selector}>{item.id === "proposal" ? "Teklif vereceğin proje" : "Değerlendireceğin proje"}<select value={projects[item.id]} disabled={busy !== null} onChange={event => setProjects(current => ({ ...current, [item.id]: event.target.value }))}><option value="">Proje seç</option>{workspace.projects.map(project => <option value={project.id} key={project.id}>{project.title}</option>)}</select></label>}
              {projectTool && access.allowed && !workspace.projects.length && <p className={styles.hint}>Şu an erişilebilir açık proje yok.</p>}
              <div className={styles.toolAction}>{action(item.id)}</div>
              {item.id === "proposal" && access.allowed && <small>Proje ekranında rolünü seç; mevcut AI Teklif Asistanı ile taslağını geliştir.</small>}
            </article>;
          })}</div>
        </section>
        <section className={styles.briefing} aria-labelledby="briefing-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>KAYITLARINDAN VE ARAÇ SONUÇLARINDAN</p><h2 id="briefing-heading">AI Briefing</h2></div><span className={styles.hint}>Kısa içgörüler, somut adımlar.</span></div><div className={styles.insights}>{briefing.map(item => <article key={item.label}><h3>{item.label}</h3><p>{item.text}</p></article>)}</div></section>
        <section aria-label="Plus araçları" className={styles.extra}><h2>Plus ile daha fazlası</h2>{AI_CAPABILITIES.slice(4, 6).map(item => <div className={styles.featureRow} key={item.id}><div><h3>{item.label}<span className={styles.badge}>Plus</span></h3><p>{item.description}</p></div>{action(item.id, true)}</div>)}</section>
        <section aria-live="polite" aria-busy={busy !== null} className={styles.results}>
          {busy && <p role="status">Analiz hazırlanıyor. Tamamlandığında sonuçlar burada görünecek.</p>}
          {requestError && <p role="alert" className={styles.error}>{requestError} İlgili aracı tekrar çalıştırabilirsin.</p>}
          {result && <ToolResult result={result} />}
        </section>
        <section className={styles.extra} aria-labelledby="advanced-heading"><div className={styles.sectionHeading}><h2 id="advanced-heading">Gelişmiş AI özellikleri</h2><span className={styles.badge}>Pro · Plus’ın tamamı dahil</span></div>{AI_CAPABILITIES.slice(6).map(item => <div className={styles.featureRow} key={item.id}><div><h3>{item.label}</h3><p>{item.description}</p></div>{action(item.id, true)}</div>)}</section>
        <aside className={styles.teaser}><div><Sparkles size={18} aria-hidden /><h2>CollaCrew AI Sohbet</h2><span className={styles.badge}>Yakında</span></div><p>Projelerin, tekliflerin ve profilin hakkında CollaCrew AI ile doğal dilde konuşabileceğin kişisel çalışma alanı yakında.</p></aside>
      </>}
  </main>;
}

function ProjectLinks({ items }: { items: FreelancerRecommendation[] }) {
  return items.length ? <ul className={styles.resultList}>{items.map(item => <li key={item.projectId + ":" + item.roleId}><div><h4>{item.title}</h4><span>{item.role} · Eşleşme %{item.score}</span><p>{item.reason}</p></div><Link href={"/freelancers/discover/" + encodeURIComponent(item.projectId)}>Projeyi incele <ArrowUpRight size={14} aria-hidden /></Link></li>)}</ul> : <p>Mevcut profil ve açık roller için uygun proje bulunamadı.</p>;
}
function amount(value: number | null) { return value === null ? "Veri yok" : value.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }); }
function ToolResult({ result }: { result: Result }) {
  const title = capabilityFor(result.intent)!.label;
  let content;
  if (result.kind === "matching") content = <><p>{result.data.summary.suitableProjects} uygun proje · {result.data.summary.strongMatches} güçlü eşleşme</p><ProjectLinks items={result.data.recommendations} />{result.intent === "advanced-matching" && result.data.nearMatches && result.data.nearMatches.length > 0 && <><h3>Yakın eşleşmeler</h3><p>Yakın eşleşme, başvuru uygunluğu anlamına gelmez. Proje ekranında rol uygunluğunu kontrol et.</p><ProjectLinks items={result.data.nearMatches} /></>}</>;
  else if (result.kind === "alerts") content = <ProjectLinks items={result.data} />;
  else if (result.kind === "project") content = <><h3>{result.projectTitle}</h3>{result.data.length ? <ul className={styles.resultList}>{result.data.map(role => <li key={role.roleId}><div><h4>{role.role} · Eşleşme %{role.score}</h4><span>{role.isEligibleForRole ? "Bu role başvuru için uygunsun" : "Bu role başvuru uygunluğu bulunmuyor"}</span><p>{role.reason}</p></div></li>)}</ul> : <p>Bu proje için değerlendirilebilir rol bulunamadı.</p>}<Link className={styles.secondary} href={"/freelancers/discover/" + encodeURIComponent(result.projectId)}>Proje detayını incele</Link></>;
  else if (result.intent === "profile") content = <><p>Mevcut profil verilerinden hesaplanan geliştirme önerileri.</p><ul className={styles.resultList}>{result.data.profileAnalysis.insights.map(item => <li key={item.area}><div><p>{item.observation}</p>{item.suggestion && <strong>{item.suggestion}</strong>}</div></li>)}</ul><Link className={styles.secondary} href="/freelancers/profile">Profilini düzenle</Link></>;
  else if (result.intent === "performance") {
    const stats = result.data.proposalPerformance;
    content = stats.hasData ? <><div className={styles.metrics}><div><strong>{stats.allTime.sent}</strong><span>Gönderilen teklif</span></div><div><strong>{stats.allTime.responded}</strong><span>Yanıtlanan</span></div><div><strong>{stats.allTime.accepted}</strong><span>Kabul edilen</span></div></div><Link href="/freelancers/performance" className={styles.secondary}>Detaylı performansını incele</Link></> : <p>Henüz teklif performansını değerlendirecek kayıt yok.</p>;
  } else if (result.intent === "competition") content = result.data.competitionInsights?.length ? <ul className={styles.resultList}>{result.data.competitionInsights.map(item => <li key={item.projectId}><div><strong>{item.totalProposals} teklif · {item.cheaperThanMe} daha düşük fiyatlı teklif</strong><p>Teklifin: {amount(item.myBidAmount)} · Ortalama: {amount(item.avgBidAmount)}</p></div><Link href={"/freelancers/discover/" + encodeURIComponent(item.projectId)}>Projeyi incele</Link></li>)}</ul> : <p>Tekliflerin için erişilebilir rekabet verisi yok.</p>;
  else {
    const insight = result.data.advancedProfileInsights;
    content = insight ? <><div className={styles.metrics}><div><strong>{amount(insight.myHourlyRate)}</strong><span>Saatlik ücretin</span></div><div><strong>{amount(insight.marketAverageHourlyRate)}</strong><span>Erişilebilir profillerin ortalaması</span></div></div><p>Örneklem: {insight.sampleSize} profil. Bu ücret önerisi değil, mevcut verilerin karşılaştırmasıdır.</p></> : <p>Gelişmiş profil karşılaştırması için yeterli veri yok.</p>;
  }
  return <article className={styles.result}><div className={styles.sectionHeading}><h2>{title}</h2><span className={styles.badge}>Mevcut veriler</span></div>{content}</article>;
}
