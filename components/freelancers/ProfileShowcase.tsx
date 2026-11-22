"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Camera, ImageIcon, Layers, MapPin, MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { ProfileAvatar } from "./ProfileAvatar";
import type { useFreelancerReviews } from "./useFreelancerReviews";
import styles from "./ProfileShowcase.module.css";

type Work = { id: string; title: string; category: string | null; description: string | null; image_url: string | null; skills: string[] | null };
type Experience = { id: string; company_name: string; position: string; start_date: string | null; end_date: string | null; description: string | null };
type Profile = { first_name: string | null; last_name: string | null; title: string | null; avatar_url: string | null; city: string | null; bio: string | null; skills: string[] | null; availability_status: string | null };

export function experiencePeriod(start: string | null, end: string | null) {
  const format = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
  };
  const from = format(start), to = format(end);
  if (!from && !to) return "";
  let period = `${from ?? "Başlangıç belirtilmedi"} – ${end ? to ?? "Bitiş belirtilmedi" : "Devam ediyor"}`;
  if (from && start) {
    const first = new Date(start), last = end ? new Date(end) : new Date();
    const months = (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth();
    if (Number.isFinite(months) && months > 0) {
      const years = Math.floor(months / 12), remainder = months % 12;
      period += " · " + [years ? `${years} yıl` : "", remainder ? `${remainder} ay` : ""].filter(Boolean).join(" ");
    }
  }
  return period;
}

function DeleteMenu({ label, onDelete }: { label: string; onDelete: () => void }) {
  return <details className={styles.menu} onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
    <summary aria-label={label + " işlemleri"}><MoreHorizontal size={18} aria-hidden /></summary>
    <div><button type="button" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onDelete(); }}><Trash2 size={14} aria-hidden />Sil</button></div>
  </details>;
}

function Stars({ value }: { value: number }) {
  return <span className={styles.stars} aria-label={`${value.toFixed(1)} / 5 yıldız`} role="img"><span aria-hidden>★★★★★</span><span aria-hidden style={{ width: `${Math.max(0, Math.min(5, value)) * 20}%` }}>★★★★★</span></span>;
}

export default function ProfileShowcase({ profile, portfolio, experiences, activeProjectCount, reviews, availability, avatarInput, onAvatar, onEdit, onAddPortfolio, onDeletePortfolio, onAddExperience, onDeleteExperience }: {
  profile: Profile; portfolio: Work[]; experiences: Experience[]; activeProjectCount: number;
  reviews: ReturnType<typeof useFreelancerReviews>; availability: ReactNode; avatarInput: ReactNode;
  onAvatar: () => void; onEdit: () => void; onAddPortfolio: () => void; onDeletePortfolio: (work: Work) => void;
  onAddExperience: () => void; onDeleteExperience: (id: string) => void;
}) {
  const [expandedBio, setExpandedBio] = useState(false), [expandedSkills, setExpandedSkills] = useState(false);
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Freelancer";
  const skills = profile.skills ?? [], longBio = (profile.bio?.length ?? 0) > 420;
  const status = profile.availability_status === "limited" ? "Sınırlı müsaitlik" : profile.availability_status === "unavailable" ? "Müsait değil" : "Müsait";
  return <div className={panelRootClass + " " + styles.page}>
    <header className={styles.hero}>
      <div className={styles.avatarWrap}><ProfileAvatar src={profile.avatar_url} name={name} className={styles.avatar} /><button type="button" className={styles.camera} aria-label="Profil fotoğrafını değiştir" onClick={onAvatar}><Camera size={17} aria-hidden /></button>{avatarInput}</div>
      <div className={styles.identity}><h1>{name}</h1><p className={styles.headline}>{profile.title || "Ünvan belirtilmedi"}</p><div className={styles.metadata}>
        {profile.city && <span><MapPin size={15} aria-hidden />{profile.city}</span>}<span><i className={styles.dot} data-status={profile.availability_status} />{status}</span><span><Layers size={15} aria-hidden />{activeProjectCount} aktif proje</span>
        {reviews.rating && !reviews.failed && <a href="#profile-reviews"><Star size={15} className={styles.starIcon} aria-hidden />{reviews.rating.average.toFixed(1)} · {reviews.rating.count} değerlendirme</a>}
      </div></div>
      <button type="button" className={buttonClasses({ variant: "secondary" })} onClick={onEdit}><Pencil size={15} aria-hidden />Profili Düzenle</button>
    </header>

    <div className={styles.aboutGrid}>
      <section className={styles.surface} aria-labelledby="profile-about-heading"><div className={styles.sectionHeading}><h2 id="profile-about-heading">Hakkımda</h2><button type="button" className={styles.iconButton} aria-label="Hakkımda bilgisini düzenle" onClick={onEdit}><Pencil size={15} aria-hidden /></button></div><p id="owner-profile-bio" className={styles.bio}>{profile.bio ? longBio && !expandedBio ? profile.bio.slice(0, 420) + "…" : profile.bio : "Henüz açıklama eklenmedi."}</p>{longBio && <button type="button" className={styles.textButton} aria-expanded={expandedBio} aria-controls="owner-profile-bio" onClick={() => setExpandedBio(value => !value)}>{expandedBio ? "Daha az göster" : "Devamını göster"}</button>}</section>
      <div className={styles.availability}>{availability}</div>
    </div>

    <section className={styles.surface} aria-labelledby="profile-skills-heading"><div className={styles.sectionHeading}><h2 id="profile-skills-heading">Uzmanlıklar</h2><button type="button" className={styles.iconButton} aria-label="Uzmanlıkları düzenle" onClick={onEdit}><Pencil size={15} aria-hidden /></button></div>{skills.length ? <div id="owner-profile-skills" className={styles.skills}>{(expandedSkills ? skills : skills.slice(0, 8)).map(skill => <span key={skill}>{skill}</span>)}{skills.length > 8 && <button type="button" aria-expanded={expandedSkills} aria-controls="owner-profile-skills" onClick={() => setExpandedSkills(value => !value)}>{expandedSkills ? "Daha az" : `+${skills.length - 8}`}</button>}</div> : <p className={styles.muted}>Henüz uzmanlık eklenmedi.</p>}</section>

    <section className={styles.workSection} aria-labelledby="profile-portfolio-heading"><div className={styles.sectionHeading}><div><h2 id="profile-portfolio-heading">Portfolyo</h2><p className={styles.muted}>Çalışmalarını sergile.</p></div><button type="button" className={buttonClasses()} onClick={onAddPortfolio}><Plus size={16} aria-hidden />Proje Ekle</button></div>
      {portfolio.length ? <div className={styles.portfolioGrid}>{portfolio.map(project => <article className={styles.workCard} key={project.id}><div className={styles.workVisual}>{project.image_url ? <img src={project.image_url} alt={project.title} loading="lazy" /> : <div className={styles.imageFallback}><ImageIcon size={25} aria-hidden /><span>Görsel yok</span></div>}<DeleteMenu label={project.title} onDelete={() => onDeletePortfolio(project)} /></div><div className={styles.workCopy}><h3>{project.title}</h3><p className={styles.muted}>{[project.category, ...(project.skills ?? []).slice(0, 2)].filter(Boolean).join(" · ")}</p>{project.description && <details className={styles.workDescription}><summary>Proje detayları</summary><p>{project.description}</p></details>}</div></article>)}</div> : <div className={styles.empty}><ImageIcon size={25} aria-hidden /><p>Henüz portfolyo projesi eklenmedi.</p></div>}
    </section>

    <section className={styles.surface} id="profile-reviews" aria-labelledby="profile-reviews-heading" aria-busy={reviews.loading}><div className={styles.sectionHeading}><h2 id="profile-reviews-heading">Yorumlar &amp; Değerlendirmeler</h2>{reviews.hasMore && !reviews.failed && <button type="button" className={styles.textButton} disabled={reviews.loading} onClick={reviews.loadMore}>{reviews.loading ? "Yükleniyor…" : "Daha fazla gör"}<ArrowRight size={15} aria-hidden /></button>}</div>
      {reviews.failed ? <p role="alert" className={styles.muted}>Değerlendirmeler yüklenemedi.</p> : <>{reviews.rating && <div className={styles.reviewSummary}><strong>{reviews.rating.average.toFixed(1)}</strong><Stars value={reviews.rating.average} /><span>{reviews.rating.count} tamamlanan çalışma değerlendirmesi</span></div>}{reviews.reviews.length ? <ul className={styles.reviews}>{reviews.reviews.map(review => <li key={review.id} className={styles.review}><div className={styles.reviewTop}><ProfileAvatar src={review.reviewerAvatar} name={review.reviewerName || "Değerlendiren kullanıcı"} className={styles.reviewAvatar} /><div className={styles.reviewIdentity}><h3>{review.reviewerName || "Değerlendiren kullanıcı"}</h3>{review.projectTitle && <p className={styles.muted}>{review.projectTitle}</p>}</div><div className={styles.reviewScore}><Stars value={review.rating} /><span>{review.rating.toFixed(1)} / 5</span></div></div><time className={styles.reviewDate} dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</time>{review.comment ? <ReviewText text={review.comment} /> : <p className={styles.muted}>Yazılı yorum eklenmemiş.</p>}</li>)}</ul> : <p className={styles.muted} role={reviews.loading ? "status" : undefined}>{reviews.loading ? "Değerlendirmeler yükleniyor…" : "Tamamlanan projelerden sonra alınan değerlendirmeler burada görünür."}</p>}</>}
    </section>

    <section className={styles.surface} aria-labelledby="profile-experience-heading"><div className={styles.sectionHeading}><h2 id="profile-experience-heading">Geçmiş Deneyimler</h2><button type="button" className={buttonClasses({ variant: "secondary" })} onClick={onAddExperience}><Plus size={15} aria-hidden />Deneyim Ekle</button></div>{experiences.length ? <ol className={styles.experiences}>{experiences.map(experience => <li key={experience.id}><div className={styles.experienceIdentity}><h3>{experience.position}</h3><p>{experience.company_name}</p><span className={styles.muted}>{experiencePeriod(experience.start_date, experience.end_date)}</span></div>{experience.description && <p className={styles.experienceDescription}>{experience.description}</p>}<DeleteMenu label={experience.position} onDelete={() => onDeleteExperience(experience.id)} /></li>)}</ol> : <p className={styles.muted}>Henüz deneyim eklenmedi.</p>}</section>
  </div>;
}

function ReviewText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return <div className={styles.reviewText}><p>{text.length > 260 && !expanded ? text.slice(0, 260) + "…" : text}</p>{text.length > 260 && <button type="button" className={styles.textButton} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Daha az göster" : "Devamını göster"}</button>}</div>;
}
