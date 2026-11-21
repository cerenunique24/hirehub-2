"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, MessageCircle, ArrowUpRight, BriefcaseBusiness, ImageIcon, Laptop, MapPin, Star } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { normalizeStringArray } from "@/lib/utils/normalizeStringArray";
import { publicDisplayName } from "@/lib/utils/displayName";
import { directoryAvailability } from "./directoryPresentation";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileReviews } from "./ProfileReviews";
import type { ProfileData, ProfileExperience, ProfilePortfolio } from "./FreelancerProfileView";
import type { ProfileRating, ProfileReview } from "./reviewPresentation";
import styles from "./PublicFreelancerProfile.module.css";

type ReviewState = { reviews: ProfileReview[]; rating: ProfileRating | null; failed: boolean; loading: boolean; hasMore: boolean; loadMore: () => void };
export type PublicProfileProps = { profile: ProfileData; portfolio: ProfilePortfolio[]; experiences: ProfileExperience[]; portfolioError: boolean; experienceError: boolean; returnTo: string; reviewState: ReviewState; viewerRole?: "client" | "freelancer"; inviteAction?: ReactNode; messageHref?: string | null; activeProjectCount?: number | null; backLabel?: string };

export function publicExperiencePeriod(start: string | null, end: string | null, isCurrent?: boolean | null) {
  const format = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString("tr-TR", { month: "short", year: "numeric", timeZone: "UTC" }) : null;
  };
  const from = format(start), to = format(end);
  if (!from && !to) return "Tarih belirtilmedi";
  return `${from ?? "Başlangıç belirtilmedi"} – ${end ? to ?? "Bitiş belirtilmedi" : isCurrent === false ? "Bitiş belirtilmedi" : "Devam ediyor"}`;
}

function PortfolioCard({ item }: { item: ProfilePortfolio }) {
  const [failed, setFailed] = useState(false);
  const href = item.project_url && /^https?:\/\//i.test(item.project_url) ? item.project_url : null;
  return <article className={styles.workCard}>
    <div className={styles.workVisual}>{item.image_url && !failed ? <Image unoptimized src={item.image_url} alt={item.title} fill sizes="(max-width:640px) 90vw, (max-width:950px) 45vw, 23vw" onError={() => setFailed(true)}/> : <div className={styles.imageFallback}><ImageIcon size={24} aria-hidden/><span>Görsel paylaşılmamış</span></div>}</div>
    <div className={styles.workCopy}><h3>{item.title}</h3>{(item.category || item.skills?.length) && <p>{[item.category, ...(item.skills ?? []).slice(0,2)].filter(Boolean).join(" · ")}</p>}{item.description && <details><summary>Çalışma hakkında</summary><p>{item.description}</p></details>}{href && <a href={href} target="_blank" rel="noopener noreferrer">Çalışmayı gör <ArrowUpRight size={14} aria-hidden/></a>}</div>
  </article>;
}

function SkillGroup({ values, id }: { values: string[]; id: string }) {
  const [expanded, setExpanded] = useState(false);
  return <div className={styles.skillGroup}><ul className={styles.skills} id={id}>{(expanded ? values : values.slice(0, 8)).map(value => <li key={value}>{value}</li>)}</ul>{values.length > 8 && <button type="button" className={styles.skillToggle} aria-controls={id} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Daha az göster" : `+${values.length - 8}`}</button>}</div>;
}

export default function PublicFreelancerProfile({ profile, portfolio, experiences, portfolioError, experienceError, returnTo, reviewState, viewerRole = "freelancer", inviteAction, messageHref, activeProjectCount, backLabel = "Geri dön" }: PublicProfileProps) {
  const [bioExpanded, setBioExpanded] = useState(false), [portfolioExpanded, setPortfolioExpanded] = useState(false), [experienceExpanded, setExperienceExpanded] = useState(false);
  const name = publicDisplayName(profile, "Freelancer");
  const specialties = [...new Set(normalizeStringArray(profile.expertise))];
  const skills = [...new Set(normalizeStringArray(profile.skills))].filter(skill => !specialties.includes(skill));
  const longBio = (profile.bio?.length ?? 0) > 420 || (profile.bio?.split("\n").length ?? 0) > 5;
  const rating = !reviewState.failed ? reviewState.rating : null;
  return <main className={`${panelRootClass} ${styles.page}`} data-viewer-role={viewerRole}>
    <Link href={returnTo} className={styles.back}><ArrowLeft size={16} aria-hidden/>{backLabel}</Link>
    <header className={styles.hero}><ProfileAvatar src={profile.avatar_url} name={name} className={styles.avatar}/><div className={styles.identity}><h1>{name}</h1><p className={styles.headline}>{profile.title || specialties[0] || "Uzmanlık belirtilmedi"}</p><div className={styles.metadata}>
      <span><i className={styles.dot} data-status={profile.availability_status}/>{directoryAvailability(profile.availability_status)}</span>{profile.city && <span><MapPin size={16} aria-hidden/>{profile.city}</span>}{viewerRole === "client" && typeof activeProjectCount === "number" && <span><BriefcaseBusiness size={16} aria-hidden/>{activeProjectCount} aktif proje</span>}{rating ? <a href="#reviews" aria-label={`${rating.average.toFixed(1)} / 5 puan, ${rating.count} değerlendirme. Değerlendirmelere git.`}><Star size={15} className={styles.star} aria-hidden/><strong>{rating.average.toFixed(1)}</strong> · {rating.count} değerlendirme</a> : <span>{reviewState.failed ? "Değerlendirmeler alınamadı" : reviewState.loading ? "Değerlendirmeler yükleniyor…" : "Henüz değerlendirme yok"}</span>}
    </div></div>{viewerRole === "client" && (inviteAction || messageHref) && <div className={styles.heroActions}>{inviteAction}{messageHref && <Link href={messageHref} className={buttonClasses({variant:"secondary"})}><MessageCircle size={16} aria-hidden/>Mesaj Gönder</Link>}</div>}</header>
    <div className={styles.layout}><div className={styles.mainColumn}>
      <section className={styles.section} aria-labelledby="public-about-heading"><h2 id="public-about-heading">Hakkımda</h2><p id="public-profile-bio" className={`${styles.bio} ${longBio && !bioExpanded ? styles.clamped : ""}`}>{profile.bio || "Profil özeti henüz eklenmemiş."}</p>{longBio && <button type="button" className={styles.textAction} aria-expanded={bioExpanded} aria-controls="public-profile-bio" onClick={() => setBioExpanded(!bioExpanded)}>{bioExpanded ? "Daha az göster" : "Devamını göster"}</button>}</section>
      <section className={styles.section} aria-labelledby="public-portfolio-heading"><div className={styles.sectionHeading}><h2 id="public-portfolio-heading">Portfolyo &amp; Çalışmalar</h2>{portfolio.length > 3 && !portfolioError && <button type="button" className={styles.textAction} aria-expanded={portfolioExpanded} aria-controls="public-portfolio-grid" onClick={() => setPortfolioExpanded(!portfolioExpanded)}>{portfolioExpanded ? "Daha az göster" : "Tüm çalışmalarını gör"}<ArrowRight size={15} aria-hidden/></button>}</div>
        {portfolioError ? <p className={styles.muted} role="alert">Portfolyo yüklenemedi. Lütfen sayfayı yenile.</p> : portfolio.length ? <div className={styles.portfolioGrid} id="public-portfolio-grid">{(portfolioExpanded ? portfolio : portfolio.slice(0, 3)).map(item => <PortfolioCard key={item.id} item={item}/>)}</div> : <p className={styles.muted}>Henüz çalışma örneği paylaşılmamış.</p>}
      </section>
      <ProfileReviews showcase reviews={reviewState.reviews} rating={rating} failed={reviewState.failed} loading={reviewState.loading} hasMore={reviewState.hasMore} onLoadMore={reviewState.loadMore}/>
      <section className={styles.section} aria-labelledby="public-experience-heading"><h2 id="public-experience-heading">Deneyim</h2>{experienceError ? <p className={styles.muted} role="alert">Deneyim kayıtları yüklenemedi.</p> : experiences.length ? <ol className={styles.experiences}>{(experienceExpanded ? experiences : experiences.slice(0, 3)).map(item => <li key={item.id}><span className={styles.companyInitial} aria-hidden>{(item.company_name || item.position || "").charAt(0)}</span><div className={styles.experienceIdentity}><h3>{item.position || "Pozisyon belirtilmedi"}</h3>{item.company_name && <p>{item.company_name}</p>}<span>{publicExperiencePeriod(item.start_date, item.is_current ? null : item.end_date, item.is_current)}</span></div>{item.description && <p className={styles.experienceDescription}>{item.description}</p>}</li>)}</ol> : <p className={styles.muted}>Deneyim kaydı henüz paylaşılmamış.</p>}{experiences.length > 3 && !experienceError && <button type="button" className={styles.textAction} aria-expanded={experienceExpanded} onClick={() => setExperienceExpanded(!experienceExpanded)}>{experienceExpanded ? "Daha az göster" : "Daha fazla deneyim göster"}</button>}</section>
    </div><aside className={styles.rail} aria-label="Çalışma bilgileri ve uzmanlıklar">
      <section className={styles.section} aria-labelledby="public-work-heading"><h2 id="public-work-heading">Çalışma bilgileri</h2><ul className={styles.workInfo}><li><i className={styles.dot} data-status={profile.availability_status}/>{directoryAvailability(profile.availability_status)}</li>{profile.experience && <li><BriefcaseBusiness size={19} aria-hidden/>{profile.experience}</li>}{profile.work_types?.length ? <li><Laptop size={19} aria-hidden/>{profile.work_types.join(" / ")}</li> : null}{profile.city && <li><MapPin size={19} aria-hidden/>{profile.city}</li>}</ul></section>
      <section className={styles.section} aria-labelledby="public-skills-heading"><h2 id="public-skills-heading">Uzmanlıklar &amp; Yetenekler</h2>{specialties.length > 0 && <SkillGroup values={specialties} id="public-specialties"/>}{skills.length > 0 && <div className={specialties.length ? styles.tools : undefined}><SkillGroup values={skills} id="public-skills"/></div>}{!skills.length && !specialties.length && <p className={styles.muted}>Uzmanlık bilgisi henüz paylaşılmamış.</p>}</section>
    </aside></div>
  </main>;
}
