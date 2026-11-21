"use client";

import Image from "next/image";
import { Check, FileText, Lightbulb, ListChecks, ScanSearch, Users, WandSparkles } from "lucide-react";
import styles from "./ProjectAnalysisLoading.module.css";

export const projectAnalysisMascots = {
  analyzing: "/images/mascots/client-discovery-search.png",
  result: "/images/mascots/project-creation-neutral.png",
};

// Descriptions of the work, never timed or server-reported completion milestones.
const steps = {
  project: [
    ["Proje detayları inceleniyor", "Açıklama, hedefler ve kapsam analiz ediliyor."],
    ["Gerekli beceriler belirleniyor", "İhtiyacına uygun yetkinlikler çıkarılıyor."],
    ["Önerilen roller hazırlanıyor", "Projen için en uygun rol yapısı oluşturuluyor."],
    ["Eşleşmeye temel hazırlanıyor", "Sonraki adım için ekip ihtiyaçları netleştiriliyor."],
  ],
  matching: [
    ["Rol ihtiyaçları değerlendiriliyor", "Belirlediğin ekip yapısı inceleniyor."],
    ["Beceri uyumu inceleniyor", "Rol ihtiyaçları yetkinliklerle karşılaştırılıyor."],
    ["Freelancer profilleri karşılaştırılıyor", "Projene uygun profiller değerlendiriliyor."],
    ["Eşleşme önerileri hazırlanıyor", "Uygun freelancer ve ekip seçenekleri hazırlanıyor."],
  ],
} as const;

const cards = [
  { icon: FileText, label: "Proje özeti", className: "document" },
  { icon: WandSparkles, label: "Beceriler", className: "skills" },
  { icon: Users, label: "Ekip yapısı", className: "team" },
  { icon: ListChecks, label: "Kapsam", className: "checklist" },
  { icon: ScanSearch, label: "Eşleşme", className: "match" },
] as const;

export function ProjectAnalysisLoading({ mascot = projectAnalysisMascots.analyzing, kind = "project", heading, active = true }: {
  mascot?: string;
  kind?: "project" | "matching";
  heading?: string;
  active?: boolean;
}) {
  const matching = kind === "matching";
  return (
    <div className={styles.loading} hidden={!active} aria-hidden={!active}>
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.orbit} />
        {cards.map(({ icon: Icon, label, className }) => (
          <div key={className} className={`${styles.card} ${styles[className]}`}>
            <span className={styles.cardIcon}><Icon size={15} strokeWidth={1.7} /></span>
            <span className={styles.cardData}><span className={styles.cardLabel}>{label}</span>
              <span className={styles.lines}><i /><i /></span>
            </span>
            {className === "checklist" && <Check size={12} className={styles.cardCheck} />}
          </div>
        ))}
        <div className={styles.mascotFloat}>
          <Image src={mascot} width={220} height={220} sizes="220px" alt="" loading="eager" className={styles.mascot} />
        </div>
      </div>

      <div className={styles.copy} role={active ? "status" : undefined} aria-live="polite" aria-busy={active}>
        <p className={styles.label}><span />Colla AI</p>
        <h2>{heading ?? (matching ? "Eşleşmeler değerlendiriliyor" : "Projen analiz ediliyor")}</h2>
        <p className={styles.description}>{matching
          ? "Rol ihtiyaçlarını freelancer profilleriyle karşılaştırarak projene uygun ekip seçeneklerini hazırlıyoruz."
          : "İhtiyaçlarını analiz ederek gerekli rolleri, becerileri ve sana en uygun ekip yapısını belirliyoruz."}</p>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressHeader}><span>ANALİZ KAPSAMI</span><span className={styles.processing}>İşleniyor</span></div>
        <ol>
          {steps[kind].map(([title, detail], index) => (
            <li key={title} className={index === 0 ? styles.current : styles.pending}>
              <span className={styles.indicator} aria-hidden="true" />
              <div><p>{title}</p><span>{detail}</span></div>
            </li>
          ))}
        </ol>
        <p className={styles.progressNote}>Projenin ihtiyaçları birlikte değerlendiriliyor.</p>
      </div>
      <p className={styles.tip}><Lightbulb size={15} aria-hidden="true" /><span><strong>İpucu</strong> Ne kadar detaylı ihtiyaç tanımlarsan, o kadar doğru eşleşme önerileri alırsın.</span></p>
    </div>
  );
}
