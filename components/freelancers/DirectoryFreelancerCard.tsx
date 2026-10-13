"use client";
import RatingSummary from "@/components/shared/RatingSummary";
import { normalizeStringArray } from "@/lib/utils/normalizeStringArray";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import { directoryAvailability,directorySkills } from "./directoryPresentation";
import { publicDisplayName } from "@/lib/utils/displayName";
import { buttonClasses } from "@/components/ui/Button";
import styles from "./FreelancerDirectory.module.css";
export type DirectoryProfile={id:string;first_name?:string|null;avatar_url?:string|null;title?:string|null;expertise?:string|null;bio?:string|null;skills?:string[]|null;availability_status?:string|null;experience?:string|null;hourly_rate?:number|null;city?:string|null};
export function DirectoryFreelancerCard({profile,returnTo,action,featured=false}:{profile:DirectoryProfile;returnTo:string;action?:ReactNode;featured?:boolean}) {
 const rememberPosition=()=>{try{sessionStorage.setItem("directory-scroll:"+returnTo,String(window.scrollY));}catch{}};
 const name=publicDisplayName(profile,"Freelancer"),skills=directorySkills(profile.skills),href="/freelancers/"+profile.id+"?returnTo="+encodeURIComponent(returnTo);
 return <article className={styles.card}>
  {featured && <span className={styles.featured}>Öne Çıkan</span>}
  <div className={styles.identity}><ProfileAvatar src={profile.avatar_url} name={name} className={styles.avatar} /><div className={styles.identityCopy}><h2><Link onClick={rememberPosition} href={href}>{name}</Link></h2><p className={styles.specialty}>{profile.title || normalizeStringArray(profile.expertise)[0] || "Uzmanlık belirtilmedi"}</p></div></div>
  {profile.expertise && <p className={styles.bio}>{normalizeStringArray(profile.expertise).join(" · ")}</p>}
  {skills.visible.length>0 && <ul className={styles.skills} aria-label="Temel beceriler">{skills.visible.map(skill=><li key={skill} title={skill}>{skill}</li>)}{skills.remaining>0 && <li aria-label={skills.remaining+" ek beceri"}>+{skills.remaining}</li>}</ul>}
  <RatingSummary key={profile.id} userId={profile.id} className={styles.cardRating} />
  <dl className={styles.cardMeta}><div><dt>Müsaitlik</dt><dd>{directoryAvailability(profile.availability_status)}</dd></div>{typeof profile.hourly_rate==="number" && profile.hourly_rate>0 && <div><dt>Saatlik ücret</dt><dd>{new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(profile.hourly_rate)}</dd></div>}</dl>
  <div className={styles.cardActions}><Link onClick={rememberPosition} href={href} className={buttonClasses({variant:"secondary",size:"sm",className:styles.profileAction})}>Profili İncele</Link>{action}</div>
 </article>;
}
