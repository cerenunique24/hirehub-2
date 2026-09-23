"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, X } from "lucide-react";

import type { OnboardingData } from "../page";

type Step2Props = {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onBack: () => void;
  onNext: () => void;
};

const expertiseByCategory: Record<string, string[]> = {
  "UI/UX Tasarım": [
    "Product Design",
    "UI Design",
    "UX Design",
    "Mobile App Design",
    "Web Design",
    "User Research",
    "UX Research",
    "Interaction Design",
    "Information Architecture",
    "Wireframing",
    "Prototyping",
    "Design Systems",
    "Usability Testing",
    "User Flow",
    "Design Strategy",
    "Responsive Design",
    "Accessibility",
    "Service Design",
  ],

  "Web Tasarım": [
    "Web Design",
    "UI Design",
    "Landing Page Design",
    "Responsive Design",
    "E-Commerce Design",
    "Dashboard Design",
    "Design Systems",
    "Interaction Design",
    "Prototyping",
    "Wireframing",
    "Visual Design",
    "Mobile-First Design",
  ],

  "Web Geliştirme": [
    "Frontend Development",
    "Backend Development",
    "Full Stack Development",
    "React Development",
    "Next.js Development",
    "JavaScript Development",
    "TypeScript Development",
    "API Development",
    "Responsive Development",
    "E-Commerce Development",
    "Web Application Development",
  ],

  "Mobil Uygulama": [
    "Mobile App Design",
    "iOS Development",
    "Android Development",
    "React Native",
    "Flutter Development",
    "Mobile UX",
    "Mobile UI",
    "Cross-Platform Development",
    "App Prototyping",
    "Mobile Product Design",
  ],

  "Yazılım Geliştirme": [
    "Frontend Development",
    "Backend Development",
    "Full Stack Development",
    "Software Architecture",
    "API Development",
    "Database Development",
    "SaaS Development",
    "Automation",
    "Cloud Development",
    "AI Development",
  ],

  "Marka Tasarımı": [
    "Brand Identity",
    "Visual Identity",
    "Logo Design",
    "Brand Strategy",
    "Art Direction",
    "Typography",
    "Packaging Design",
    "Brand Guidelines",
    "Creative Direction",
  ],

  "Grafik Tasarım": [
    "Graphic Design",
    "Visual Design",
    "Editorial Design",
    "Social Media Design",
    "Poster Design",
    "Print Design",
    "Packaging Design",
    "Typography",
    "Illustration",
    "Art Direction",
    "Presentation Design",
  ],

  "E-Ticaret": [
    "E-Commerce Design",
    "E-Commerce Development",
    "Shopify",
    "WooCommerce",
    "Product Page Design",
    "Conversion Optimization",
    "E-Commerce UX",
    "Marketplace Design",
  ],

  "Dijital Pazarlama": [
    "Digital Marketing",
    "Social Media Marketing",
    "Performance Marketing",
    "SEO",
    "Content Marketing",
    "Email Marketing",
    "Growth Marketing",
    "Google Ads",
    "Meta Ads",
    "Marketing Strategy",
  ],

  "İçerik Üretimi": [
    "Content Creation",
    "Copywriting",
    "Content Writing",
    "Social Media Content",
    "Video Content",
    "Creative Writing",
    "Blog Writing",
    "Script Writing",
    "Content Strategy",
  ],

  "3D Tasarım": [
    "3D Modeling",
    "3D Visualization",
    "3D Rendering",
    "Product Visualization",
    "Architectural Visualization",
    "3D Animation",
    "Motion Design",
    "Character Design",
    "Environment Design",
  ],

  "Mimari & İç Mekân": [
    "Interior Architecture",
    "Architectural Design",
    "Interior Design",
    "Space Planning",
    "3D Visualization",
    "Architectural Visualization",
    "Furniture Design",
    "Concept Design",
    "Technical Drawing",
    "Renovation Design",
  ],

  Diğer: [
    "Creative Direction",
    "Art Direction",
    "Consulting",
    "Research",
    "Strategy",
    "Project Management",
  ],
};

const allSkills = [
  "Figma",
  "FigJam",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Adobe InDesign",
  "Adobe XD",
  "Adobe After Effects",
  "Adobe Premiere Pro",
  "Adobe Lightroom",
  "Adobe Acrobat",
  "Adobe Animate",
  "Adobe Audition",
  "Adobe Fresco",
  "Substance 3D Painter",
  "Substance 3D Designer",
  "Sketch",
  "SketchUp",
  "Microsoft Word",
  "Microsoft Excel",
  "Microsoft PowerPoint",
  "Microsoft Outlook",
  "Microsoft Teams",
  "Microsoft Access",
  "Microsoft Project",
  "AutoCAD",
  "3ds Max",
  "Maya",
  "Revit",
  "Fusion 360",
  "Inventor",
  "Civil 3D",
  "Navisworks",
  "Canva",
  "Notion",
  "Jira",
  "Slack",
  "Blender",
  "Cinema 4D",
  "Rhino",
  "Archicad",
  "SolidWorks",
  "Unity",
  "Unreal Engine",
  "Webflow",
  "Framer",
  "WordPress",
  "Shopify",
  "WooCommerce",
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "Node.js",
  "Python",
  "PHP",
  "Java",
  "C#",
  "C++",
  "Flutter",
  "React Native",
];

export default function Step2({
  data,
  onChange,
  onBack,
  onNext,
}: Step2Props) {
  const [expertiseOpen, setExpertiseOpen] =
    useState(false);

  const [expertiseSearch, setExpertiseSearch] =
    useState("");

  const [skillsOpen, setSkillsOpen] =
    useState(false);

  const [skillsSearch, setSkillsSearch] =
    useState("");

  const [error, setError] = useState("");

  const expertiseRef =
    useRef<HTMLDivElement>(null);

  const skillsRef =
    useRef<HTMLDivElement>(null);

  const suggestedExpertise = useMemo(() => {
    const selectedCategories =
      data.categories.length > 0
        ? data.categories
        : ["Diğer"];

    const combined = selectedCategories.flatMap(
      (category) =>
        expertiseByCategory[category] ?? []
    );

    return [
      ...new Set(combined),
    ];
  }, [data.categories]);

  const filteredExpertise =
    suggestedExpertise.filter((item) =>
      item
        .toLowerCase()
        .includes(
          expertiseSearch.trim().toLowerCase()
        )
    );

  const filteredSkills = allSkills.filter((skill) =>
    skill
      .toLowerCase()
      .includes(skillsSearch.trim().toLowerCase())
  );

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        expertiseRef.current &&
        !expertiseRef.current.contains(target)
      ) {
        setExpertiseOpen(false);
      }

      if (
        skillsRef.current &&
        !skillsRef.current.contains(target)
      ) {
        setSkillsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpertiseOpen(false);
        setSkillsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  function toggleExpertise(
    expertise: string
  ) {
    setError("");

    const selected =
      data.expertiseAreas.includes(expertise);

    if (selected) {
      onChange({
        expertiseAreas:
          data.expertiseAreas.filter(
            (item) => item !== expertise
          ),
      });

      return;
    }

    if (data.expertiseAreas.length >= 10) {
      setError(
        "En fazla 10 uzmanlık alanı seçebilirsin."
      );
      return;
    }

    onChange({
      expertiseAreas: [
        ...data.expertiseAreas,
        expertise,
      ],
    });
  }

  function removeExpertise(
    expertise: string
  ) {
    onChange({
      expertiseAreas:
        data.expertiseAreas.filter(
          (item) => item !== expertise
        ),
    });
  }

  function addSkill(skill: string) {
    setError("");

    if (data.skills.includes(skill)) {
      setSkillsOpen(false);
      setSkillsSearch("");
      return;
    }

    if (data.skills.length >= 12) {
      setError(
        "En fazla 12 beceri veya araç seçebilirsin."
      );
      return;
    }

    onChange({
      skills: [
        ...data.skills,
        skill,
      ],
    });

    setSkillsSearch("");
    setSkillsOpen(false);
  }

  function removeSkill(skill: string) {
    onChange({
      skills: data.skills.filter(
        (item) => item !== skill
      ),
    });
  }

  function continueStep() {
    setError("");

    if (data.expertiseAreas.length === 0) {
      setError(
        "En az 1 uzmanlık alanı seçmelisin."
      );
      return;
    }

    if (!data.experience) {
      setError(
        "Deneyim seviyeni seçmelisin."
      );
      return;
    }

    onNext();
  }

  return (
    <div>
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          Adım 2 / 3
        </span>

        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.01em] text-gray-950 sm:text-4xl">
          Uzmanlıklarını belirle
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
          Hangi konularda uzman olduğunu ve hangi
          araçları kullandığını belirt.
        </p>
      </div>

      <div className="space-y-9">
        {/* UZMANLIK */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Uzmanlık alanların
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                En fazla 10 uzmanlık seçebilirsin.
              </p>
            </div>

            <span className="shrink-0 text-xs text-gray-400">
              {data.expertiseAreas.length} / 10
            </span>
          </div>

          <div
            ref={expertiseRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() => {
                setSkillsOpen(false);
                setExpertiseOpen(
                  !expertiseOpen
                );
              }}
              className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-sm text-gray-700 outline-none transition hover:border-gray-400"
            >
              <span>
                {data.expertiseAreas.length > 0
                  ? "Uzmanlık ekle"
                  : "Uzmanlık alanı seç"}
              </span>

              <ChevronDown
                size={17}
                className={`text-gray-400 transition ${
                  expertiseOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {expertiseOpen && (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b border-gray-100 p-3">
                  <input
                    autoFocus
                    type="text"
                    value={expertiseSearch}
                    onChange={(event) =>
                      setExpertiseSearch(
                        event.target.value
                      )
                    }
                    placeholder="Uzmanlık ara..."
                    className="w-full rounded-xl bg-gray-50 px-3.5 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:bg-gray-100"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredExpertise.length ===
                  0 ? (
                    <div className="px-3 py-8 text-center text-sm text-gray-400">
                      Uzmanlık bulunamadı.
                    </div>
                  ) : (
                    filteredExpertise.map(
                      (expertise) => {
                        const selected =
                          data.expertiseAreas.includes(
                            expertise
                          );

                        return (
                          <button
                            key={expertise}
                            type="button"
                            onClick={() =>
                              toggleExpertise(
                                expertise
                              )
                            }
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                              selected
                                ? "bg-gray-100 text-gray-950"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span>
                              {expertise}
                            </span>

                            {selected && (
                              <Check
                                size={16}
                                className="text-[var(--color-text-primary)]"
                              />
                            )}
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {data.expertiseAreas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.expertiseAreas.map(
                (expertise) => (
                  <span
                    key={expertise}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
                  >
                    {expertise}

                    <button
                      type="button"
                      onClick={() =>
                        removeExpertise(
                          expertise
                        )
                      }
                      className="text-gray-400 transition hover:text-[var(--color-text-primary)]"
                    >
                      <X size={13} />
                    </button>
                  </span>
                )
              )}
            </div>
          )}
        </section>

        {/* BECERİLER */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Beceriler ve araçlar
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Kullandığın programları ve teknik
                becerileri seç.
              </p>
            </div>

            <span className="shrink-0 text-xs text-gray-400">
              {data.skills.length} / 12
            </span>
          </div>

          <div
            ref={skillsRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() => {
                setExpertiseOpen(false);
                setSkillsOpen(!skillsOpen);
              }}
              className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-sm text-gray-700 outline-none transition hover:border-gray-400"
            >
              <span>
                Beceri veya araç ekle
              </span>

              <ChevronDown
                size={17}
                className={`text-gray-400 transition ${
                  skillsOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {skillsOpen && (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b border-gray-100 p-3">
                  <input
                    autoFocus
                    type="text"
                    value={skillsSearch}
                    onChange={(event) =>
                      setSkillsSearch(
                        event.target.value
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        filteredSkills.length > 0
                      ) {
                        event.preventDefault();
                        addSkill(
                          filteredSkills[0]
                        );
                      }
                    }}
                    placeholder="Program veya beceri ara..."
                    className="w-full rounded-xl bg-gray-50 px-3.5 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:bg-gray-100"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredSkills.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-gray-400">
                      Beceri veya araç bulunamadı.
                    </div>
                  ) : (
                    filteredSkills.map(
                      (skill) => {
                        const selected =
                          data.skills.includes(
                            skill
                          );

                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() =>
                              addSkill(skill)
                            }
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                              selected
                                ? "bg-gray-100 text-gray-950"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span>{skill}</span>

                            {selected && (
                              <Check
                                size={16}
                                className="text-[var(--color-text-primary)]"
                              />
                            )}
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {data.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700"
                >
                  {skill}

                  <button
                    type="button"
                    onClick={() =>
                      removeSkill(skill)
                    }
                    className="text-gray-400 transition hover:text-[var(--color-text-primary)]"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* DENEYİM */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-950">
              Deneyim seviyen
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Proje eşleşmelerinde kullanılacak.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              "Yeni başlayan",
              "1-3 yıl",
              "3-5 yıl",
              "5-10 yıl",
              "10+ yıl",
            ].map((experience) => {
              const selected =
                data.experience ===
                experience;

              return (
                <button
                  key={experience}
                  type="button"
                  onClick={() =>
                    onChange({
                      experience,
                    })
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {experience}
                </button>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-12 items-center justify-center rounded-xl px-5 text-sm font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          >
            Geri
          </button>

          <button
            type="button"
            onClick={continueStep}
            className="flex h-12 min-w-[170px] items-center justify-center rounded-xl bg-[var(--color-primary-600)] px-7 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-700)]"
          >
            Devam et
          </button>
        </div>
      </div>
    </div>
  );
}