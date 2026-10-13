"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { directoryAvailability } from "./directoryPresentation";
import { normalizeStringArray } from "@/lib/utils/normalizeStringArray";
import { publicDisplayName } from "@/lib/utils/displayName";
import { buttonClasses } from "@/components/ui/Button";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { ProfileReviews } from "./ProfileReviews";
import type { ProfileRating,ProfileReview } from "./reviewPresentation";
import styles from "./FreelancerProfile.module.css";
export type ProfileData = {
    id: string;
    first_name: string | null;
    avatar_url: string | null;
    title: string | null;
    bio: string | null;
    expertise: string | null;
    skills: string[] | null;
    availability_status: string | null;
    availability_note?: string | null;
    available_from?: string | null;
    experience: string | null;
    hourly_rate: number | null;
    city: string | null;
    work_types?: string[] | null;
    languages?: string[] | null;
    profile_completion?: number | null;
};
export type ProfilePortfolio = {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
    image_url: string | null;
    project_url: string | null;
};
export type ProfileExperience = {
    id: string;
    company_name: string | null;
    position: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
};
function PortfolioVisual({ item }: {
    item: ProfilePortfolio;
}) { const [failed, setFailed] = useState(false); return <div className={styles.portfolioVisual}>{item.image_url && !failed ? <Image unoptimized src={item.image_url} alt={item.title} fill sizes="(max-width:639px) 90vw,45vw" onError={() => setFailed(true)}/> : <div className={styles.visualFallback}><BriefcaseBusiness size={32}/><span>{item.category || "Çalışma örneği"}</span></div>}</div>; }
function date(value: string | null) { if (!value)
    return null; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString("tr-TR", { month: "short", year: "numeric" }) : null; }
export function FreelancerProfileView({ profile, portfolio, experiences, portfolioError, experienceError, returnTo, inviteAction, messageHref, reviewState={reviews:[],rating:null,failed:false,loading:false,hasMore:false,loadMore:()=>{}} }: {
    reviewState?: {reviews:ProfileReview[];rating:ProfileRating|null;failed:boolean;loading:boolean;hasMore:boolean;loadMore:()=>void};
    profile: ProfileData;
    portfolio: ProfilePortfolio[];
    experiences: ProfileExperience[];
    portfolioError: boolean;
    experienceError: boolean;
    returnTo: string;
    inviteAction?: ReactNode;
    messageHref?: string | null;
}) {
    const [expandedBio, setExpandedBio] = useState(false), [expandedSkills, setExpandedSkills] = useState(false);
    const [expandedPortfolio,setExpandedPortfolio]=useState(false),[expandedExperience,setExpandedExperience]=useState(false);
    const name = publicDisplayName(profile, "Freelancer"), specialties = normalizeStringArray(profile.expertise), skills = [...new Set(normalizeStringArray(profile.skills))];
    const longBio = (profile.bio?.length ?? 0) > 300 || (profile.bio?.split("\n").length??0)>5, bio = longBio && !expandedBio ? profile.bio!.slice(0, 480) + "…" : profile.bio;
    const hasActions = Boolean(inviteAction || messageHref);
    return <main className={[panelRootClass, styles.page].join(" ")}>
  <Link href={returnTo} className={styles.back}><ArrowLeft size={16}/>Geri dön</Link>
  <div className={styles.profile}>
  <div className={styles.profileLayout}>
   <header className={styles.header}>
    <div className={styles.identity}><ProfileAvatar src={profile.avatar_url} name={name} className={styles.avatar}/><div className={styles.identityCopy}><p className={styles.eyebrow}>Freelancer profili</p><h1>{name}</h1><p className={styles.title}>{profile.title || specialties[0] || "Uzmanlık belirtilmedi"}</p>{specialties.length > 0 && <p className={styles.specialties}>{specialties.slice(0, 2).join(" · ")}</p>}<div className={styles.identityMeta}><span>{directoryAvailability(profile.availability_status)}</span>{profile.city && <span>{profile.city}</span>}</div></div></div>
    <div className={styles.headerSummary}>
     <div className={styles.trustGroup}><p className={styles.eyebrow}>Platform güveni</p><div className={styles.rating}>{reviewState.rating ? <span>★ {reviewState.rating.average.toFixed(1)} · {reviewState.rating.count} değerlendirme</span> : <span>{reviewState.loading ? "Değerlendirmeler yükleniyor…" : reviewState.failed ? "Değerlendirmeler alınamadı" : "Henüz değerlendirme yok"}</span>}</div></div>
         {hasActions && <div id="profile-actions" className={styles.headerActions}>{inviteAction}{messageHref && <Link href={messageHref} className={buttonClasses({ variant: "secondary", size: "md" })}>Mesaj Gönder</Link>}</div>}

    </div>
   </header>

   <div className={styles.mainColumn}>
   <section id="about" className={styles.section}><p className={styles.eyebrow}>Tanışalım</p><h2>Hakkında</h2><p id="profile-bio" className={[styles.bio,!expandedBio ? styles.bioCollapsed : ""].join(" ")}>{bio || "Profil özeti henüz eklenmemiş."}</p>{longBio && <button type="button" aria-expanded={expandedBio} aria-controls="profile-bio" className={styles.textAction} onClick={() => setExpandedBio(value => !value)}>{expandedBio ? "Daha az göster" : "Devamını göster"}</button>}</section>
   <section id="portfolio" className={[styles.section, styles.portfolio].join(" ")}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>İş örnekleri</p><h2>Portföy ve çalışmalar</h2></div>{portfolio.length > 0 && <span className={styles.muted}>{portfolio.length} çalışma</span>}</div>{portfolioError ? <p role="alert" className={styles.muted}>Portföy yüklenemedi. Lütfen sayfayı yenile.</p> : portfolio.length === 0 ? <p className={styles.muted}>Henüz çalışma örneği paylaşılmamış.</p> : <div className={styles.portfolioGrid} data-single={portfolio.length===1}>{(expandedPortfolio ? portfolio : portfolio.slice(0,4)).map(item => <article key={item.id}><PortfolioVisual item={item}/><div className={styles.portfolioCopy}>{item.category && <p className={styles.eyebrow}>{item.category}</p>}<h3>{item.title}</h3>{item.description && <p>{item.description}</p>}{item.project_url && /^https?:\/\//i.test(item.project_url) && <a href={item.project_url} target="_blank" rel="noopener noreferrer" className={styles.textAction}>Portfolyoyu Gör<ArrowUpRight size={16}/></a>}</div></article>)}</div>}{portfolio.length>4 && !portfolioError && <button type="button" className={styles.textAction} aria-expanded={expandedPortfolio} onClick={()=>setExpandedPortfolio(value=>!value)}>{expandedPortfolio ? "Daha az çalışma göster" : "Tüm portfolyoyu gör · "+portfolio.length}</button>}</section>
   <section id="experience" className={styles.section}><h2>Deneyim ve geçmiş</h2>{profile.experience && <p className={styles.muted}>{profile.experience}</p>}{experienceError ? <p role="alert" className={styles.muted}>Deneyim kayıtları yüklenemedi.</p> : experiences.length > 0 ? <ol className={styles.experiences}>{(expandedExperience ? experiences : experiences.slice(0,3)).map(item => <li key={item.id}><div><h3>{item.position || "Pozisyon belirtilmedi"}</h3>{item.company_name && <p>{item.company_name}</p>}{item.description && <p className={styles.experienceDescription}>{item.description}</p>}</div><span className={styles.muted}>{[date(item.start_date), date(item.end_date)].filter(Boolean).join(" – ")}</span></li>)}</ol> : !profile.experience && <p className={styles.muted}>Deneyim bilgisi henüz eklenmemiş.</p>}{experiences.length>3 && !experienceError && <button type="button" aria-expanded={expandedExperience} className={styles.textAction} onClick={()=>setExpandedExperience(value=>!value)}>{expandedExperience ? "Daha az deneyim göster" : "Daha fazla deneyim göster"}</button>}</section>
   <ProfileReviews reviews={reviewState.reviews} rating={reviewState.rating} failed={reviewState.failed} loading={reviewState.loading} hasMore={reviewState.hasMore} onLoadMore={reviewState.loadMore} />
   </div>
   <aside className={styles.decisionColumn} aria-label="Uzmanlık ve çalışma bilgileri"><div className={styles.decisionPanel}>
        <section id="skills" className={styles.section}><h2>Uzmanlıklar ve yetenekler</h2>{specialties.length > 0 && <p className={styles.specialties}>{specialties.join(" · ")}</p>}{skills.length > 0 ? <ul id="profile-skills" className={styles.skills}>{(expandedSkills ? skills : skills.slice(0, 6)).map(skill => <li key={skill}>{skill}</li>)}</ul> : <p className={styles.muted}>Yetenek bilgisi henüz eklenmemiş.</p>}{skills.length > 6 && <button type="button" aria-expanded={expandedSkills} aria-controls="profile-skills" onClick={() => setExpandedSkills(value => !value)} className={styles.textAction}>{expandedSkills ? "Daha az yetenek göster" : "Tüm yetenekleri göster · " + skills.length}</button>}</section>

        <section id="work-preferences" className={styles.section}><h2>Çalışma tercihi</h2><dl className={styles.preferences}>{profile.work_types?.length ? <div><dt>Çalışma tipi</dt><dd>{profile.work_types.join(" · ")}</dd></div> : null}{profile.languages?.length ? <div><dt>Diller</dt><dd>{profile.languages.join(" · ")}</dd></div> : null}{typeof profile.hourly_rate === "number" && profile.hourly_rate > 0 && <div><dt>Saatlik ücret</dt><dd>{new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(profile.hourly_rate)}</dd></div>}{typeof profile.profile_completion === "number" && profile.profile_completion >= 0 && profile.profile_completion <= 100 && <div><dt>Profil doluluğu</dt><dd>%{profile.profile_completion}</dd></div>}</dl>{profile.availability_note && <p className={styles.bio}>{profile.availability_note}</p>}{profile.available_from && date(profile.available_from) && <p className={styles.muted}>Uygunluk tarihi: {new Date(profile.available_from).toLocaleDateString("tr-TR")}</p>}</section>

   </div></aside>
  </div>
  </div>
 </main>;
}
