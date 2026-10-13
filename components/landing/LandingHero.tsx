import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Sparkles, Star, UserRound } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import styles from "./LandingHero.module.css";

export default function LandingHero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-hero-title">
      <div className={styles.layout}>
        <div className={styles.content}>
          <span className={styles.badge}>
            <Sparkles size={14} aria-hidden="true" />
            AI-native freelance iş birliği
          </span>
          <h1 id="landing-hero-title" className={styles.title}>
            Projeni anlat.<br />
            <span>Ekibini AI kursun.</span>
          </h1>
          <p className={styles.description}>
            CollaCrew projeni analiz eder, gereken rolleri çıkarır ve seni doğru
            freelancerlarla tek bir çalışma alanında buluşturur.
          </p>
          <div className={styles.actions}>
            <Link href="/register" className={buttonClasses({ variant: "primary", size: "lg", className: styles.cta })}>
              Ücretsiz Başla <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className={buttonClasses({ variant: "secondary", size: "lg", className: styles.cta })}>
              Nasıl Çalışır?
            </a>
          </div>
        </div>

        <div className={styles.composition}>
          <div className={styles.blob} aria-hidden="true" />
          <svg className={styles.connections} viewBox="0 0 520 520" fill="none" aria-hidden="true">
            <path d="M75 156C135 90 216 95 251 150M354 340C441 319 481 347 450 410" stroke="#b8c3e6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 7" />
          </svg>
          <Image
            src="/images/collacrew-mascot.png"
            alt="Kollarını açmış, göz kırpan mavi CollaCrew maskotu"
            width={1254}
            height={1254}
            sizes="(min-width: 1200px) 480px, (min-width: 900px) 42vw, (min-width: 600px) 460px, 86vw"
            loading="eager"
            className={styles.mascot}
          />
          <div className={styles.matchChip}>
            <span className={styles.chipIcon}><Sparkles size={16} aria-hidden="true" /></span>
            AI eşleşme bulundu
            <span className={styles.statusDot} aria-hidden="true" />
          </div>
          <div className={styles.teamChip}>
            <span className={styles.checkIcon}><Check size={15} aria-hidden="true" /></span>
            Ekibin hazır
          </div>
          <span className={styles.avatarOne} aria-hidden="true">
            <UserRound size={27} strokeWidth={1.6} />
            <span className={styles.avatarStatus}><Check size={10} /></span>
          </span>
          <span className={styles.avatarTwo} aria-hidden="true">
            <UserRound size={25} strokeWidth={1.6} />
            <span className={styles.avatarStatus}><Check size={10} /></span>
          </span>
          <Star className={styles.star} size={21} strokeWidth={1.3} aria-hidden="true" />
          <Sparkles className={styles.spark} size={25} strokeWidth={1.4} aria-hidden="true" />
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.caption}>İyi işler, doğru ekiple başlar.</p>
        </div>
      </div>
    </section>
  );
}
