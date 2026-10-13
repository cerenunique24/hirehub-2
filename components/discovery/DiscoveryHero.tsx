import { Sparkles } from "lucide-react";
import { DashboardMascot } from "@/components/dashboard/DashboardMascot";
import styles from "./Discovery.module.css";
export function DiscoveryHero() {
 return <header className={styles.hero}>
  <div className={styles.heroCopy}>
   <span className={styles.eyebrow}><Sparkles size={16} />AI destekli keşif</span>
   <h1>Sana uygun projeleri keşfet</h1>
   <p>Yeteneklerine ve profil bilgilerine uygun rolleri incele. Bir sonraki iş birliğini burada bul.</p>
  </div>
  <div className={styles.heroVisual} aria-hidden="true">
   <svg className={styles.blob} viewBox="0 0 520 260" fill="none">
    <defs><linearGradient id="discovery-wash" x1="80" y1="30" x2="420" y2="240" gradientUnits="userSpaceOnUse"><stop stopColor="#E2D6FA" /><stop offset=".48" stopColor="#CBDEFC" /><stop offset=".78" stopColor="#F6D7E5" /><stop offset="1" stopColor="#D8E3FC" /></linearGradient></defs>
    <path d="M25 100C53 63 101 9 166 13C226 17 244 68 293 54C345 39 383-3 431 15C481 33 441 94 467 124C490 151 528 171 506 207C482 247 419 216 377 226C329 238 286 272 237 250C194 231 171 207 117 207C62 207-20 159 25 100Z" fill="url(#discovery-wash)" />
    <path d="M69 135l6 11m-8 17l7-1M477 99l-5 11m20 5l-10 6" stroke="#AAB8E4" strokeWidth="5" strokeLinecap="round" />
   </svg>
   <DashboardMascot pose="search" size={240} className={styles.mascot} eager />
   <span className={styles.visualNote}>Sana<br />uygun projeler<br />burada!</span>
   <svg className={styles.noteArrow} viewBox="0 0 100 65" fill="none"><path d="M94 55C70 53 65 29 79 31C96 34 74 62 47 48C32 40 24 24 20 12M16 19l4-8 7 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
 </header>;
}
