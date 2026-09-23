"use client";

import type { ReactNode } from "react";
import type { ProjectAnalysis } from "@/types/ai";
import {
  AlertCircle,
  Check,
  Clock3,
  Layers3,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

interface ProjectAnalysisDisplayProps {
  title: string;
  analysis: ProjectAnalysis;
}

const complexityMap: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
};

const categoryMap: Record<string, string> = {
  design: "Tasarım",
  development: "Yazılım Geliştirme",
  web: "Web Geliştirme",
  mobile: "Mobil Uygulama",
  marketing: "Pazarlama",
  branding: "Marka ve Kimlik",
  ecommerce: "E-ticaret",
  content: "İçerik",
  consulting: "Danışmanlık",
  software: "Yazılım",
  ux: "UX Tasarım",
  ui: "UI Tasarım",
  "ui/ux": "UI/UX Tasarım",
};

const roleMap: Record<string, string> = {
  "ux designer": "UX/UI Tasarımcısı",
  "ui designer": "UI Tasarımcısı",
  "ui/ux designer": "UI/UX Tasarımcısı",
  "product designer": "Ürün Tasarımcısı",
  "graphic designer": "Grafik Tasarımcı",
  "web designer": "Web Tasarımcısı",
  "frontend developer": "Frontend Geliştirici",
  "front-end developer": "Frontend Geliştirici",
  "frontend engineer": "Frontend Geliştirici",
  "backend developer": "Backend Geliştirici",
  "back-end developer": "Backend Geliştirici",
  "backend engineer": "Backend Geliştirici",
  "full stack developer": "Full Stack Geliştirici",
  "full-stack developer": "Full Stack Geliştirici",
  "mobile developer": "Mobil Uygulama Geliştiricisi",
  "ios developer": "iOS Geliştiricisi",
  "android developer": "Android Geliştiricisi",
  "project manager": "Proje Yöneticisi",
  "product manager": "Ürün Yöneticisi",
  copywriter: "Metin Yazarı",
  "content writer": "İçerik Yazarı",
  "seo specialist": "SEO Uzmanı",
  "digital marketer": "Dijital Pazarlama Uzmanı",
  "marketing specialist": "Pazarlama Uzmanı",
  "brand designer": "Marka Tasarımcısı",
  "art director": "Sanat Yönetmeni",
  illustrator: "İllüstratör",
  "motion designer": "Motion Tasarımcı",
  "3d designer": "3D Tasarımcı",
  "3d artist": "3D Tasarımcı",
  photographer: "Fotoğrafçı",
  "video editor": "Video Editörü",
};

const skillMap: Record<string, string> = {
  figma: "Figma",
  "user research": "Kullanıcı Araştırması",
  "user testing": "Kullanıcı Testleri",
  prototyping: "Prototipleme",
  wireframing: "Wireframe",
  "design system": "Tasarım Sistemi",
  "responsive design": "Responsive Tasarım",
  "frontend development": "Frontend Geliştirme",
  "backend development": "Backend Geliştirme",
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  "next.js": "Next.js",
  nextjs: "Next.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  supabase: "Supabase",
  firebase: "Firebase",
  "api integration": "API Entegrasyonu",
  "database design": "Veritabanı Tasarımı",
  seo: "SEO",
  "content strategy": "İçerik Stratejisi",
};

const expertiseMap: Record<string, string> = {
  "ui/ux design": "UI/UX Tasarımı",
  "ux design": "UX Tasarımı",
  "ui design": "UI Tasarımı",
  "product design": "Ürün Tasarımı",
  "graphic design": "Grafik Tasarım",
  "web design": "Web Tasarımı",
  "mobile app design": "Mobil Uygulama Tasarımı",
  "frontend development": "Frontend Geliştirme",
  "backend development": "Backend Geliştirme",
  "full stack development": "Full Stack Geliştirme",
  "mobile development": "Mobil Uygulama Geliştirme",
  branding: "Markalama",
  "brand identity": "Marka Kimliği",
  "digital marketing": "Dijital Pazarlama",
  "content creation": "İçerik Üretimi",
};

function normalize(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function translateComplexity(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Belirtilmedi";
  }

  return complexityMap[normalize(value)] ?? value;
}

function translateCategory(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Belirtilmedi";
  }

  return categoryMap[normalize(value)] ?? value;
}

function translateRole(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Belirtilmedi";
  }

  return roleMap[normalize(value)] ?? value;
}

function translateSkill(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Belirtilmedi";
  }

  return skillMap[normalize(value)] ?? value;
}

function translateExpertise(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Belirtilmedi";
  }

  return expertiseMap[normalize(value)] ?? value;
}

function translateItems(
  items: string[] | undefined,
  translator: (value: unknown) => string
): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => translator(item));
}

export default function ProjectAnalysisDisplay({
  title,
  analysis,
}: ProjectAnalysisDisplayProps) {
  const roles = translateItems(analysis.requiredRoles, translateRole);

  const skills = translateItems(
    analysis.requiredSkills,
    translateSkill
  );

  const expertise = translateItems(
    analysis.requiredExpertise,
    translateExpertise
  );

  const deliverables = Array.isArray(analysis.deliverables)
    ? analysis.deliverables.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];

  const considerations = Array.isArray(analysis.considerations)
    ? analysis.considerations.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];

  const category = translateCategory(analysis.category);

  const complexity = translateComplexity(analysis.complexity);

  const teamSize = Number(analysis.recommendedTeamSize) || 1;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="bg-neutral-950 px-6 py-8 text-white md:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Sparkles size={20} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                CollaCrew AI Analizi
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.01em] md:text-3xl">
                Projenizi analiz ettik
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
                Projenizin kapsamını, ihtiyaç duyduğu uzmanlıkları ve ekip
                yapısını belirledik.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-400">
                Proje
              </p>

              <h3 className="mt-1 break-words text-xl font-semibold text-neutral-950">
                {title || "İsimsiz Proje"}
              </h3>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600">
                {analysis.summary || "Proje özeti bulunmuyor."}
              </p>
            </div>

            <span className="inline-flex w-fit shrink-0 items-center rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
              {category}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Clock3 size={18} />}
          label="Tahmini süre"
          value={analysis.estimatedTimeline || "Belirtilmedi"}
        />

        <MetricCard
          icon={<Wallet size={18} />}
          label="Tahmini bütçe"
          value={analysis.estimatedBudget || "Belirtilmedi"}
        />

        <MetricCard
          icon={<Layers3 size={18} />}
          label="Karmaşıklık"
          value={complexity}
        />

        <MetricCard
          icon={<Users size={18} />}
          label="Önerilen ekip"
          value={`${teamSize} freelancer`}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <InfoSection
          icon={<Users size={18} />}
          title="Gerekli Roller"
          description="Projeyi tamamlamak için önerilen profesyonel roller."
          items={roles}
        />

        <InfoSection
          icon={<Layers3 size={18} />}
          title="Gerekli Uzmanlıklar"
          description="Projede ihtiyaç duyulan temel uzmanlık alanları."
          items={expertise}
        />
      </section>

      <InfoSection
        icon={<Check size={18} />}
        title="Gerekli Beceriler"
        description="Projede öne çıkan teknik ve profesyonel beceriler."
        items={skills}
      />

      <InfoSection
        icon={<Check size={18} />}
        title="Beklenen Teslimatlar"
        description="Proje sonunda ortaya çıkması beklenen çıktılar."
        items={deliverables}
      />

      <section className="rounded-xl bg-neutral-950 p-5 text-white md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles size={18} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Proje İçgörüsü
            </p>

            <p className="mt-3 text-sm leading-7 text-neutral-300">
              {analysis.insights || "Proje içgörüsü bulunmuyor."}
            </p>
          </div>
        </div>
      </section>

      {considerations.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700">
              <AlertCircle size={18} />
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-neutral-950">
                Proje Notları
              </h3>

              <ul className="mt-4 space-y-3">
                {considerations.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex items-start gap-3 text-sm leading-6 text-neutral-600"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoSection({
  icon,
  title,
  description,
  items,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm md:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-neutral-950">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-neutral-500">
            {description}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm font-medium text-neutral-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-neutral-400">
          Bu alan için henüz bilgi bulunmuyor.
        </p>
      )}
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
        {icon}
      </div>

      <p className="mt-4 text-sm text-neutral-400">
        {label}
      </p>

      <p className="mt-1 break-words text-base font-semibold text-neutral-950">
        {value}
      </p>
    </div>
  );
}
