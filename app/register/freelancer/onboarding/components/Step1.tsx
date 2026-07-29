"use client";

import { useState } from "react";

type Step1Props = {
  onNext: () => void;
};

const expertiseOptions = [
  "UI/UX Design",
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "Mobile Development",
  "Graphic Design",
  "3D Design",
  "Motion Design",
  "Digital Marketing",
  "SEO",
  "Video Editing",
  "WordPress",
];

export default function Step1({ onNext }: Step1Props) {
  const [expertise, setExpertise] = useState<string[]>([]);
  const [skill, setSkill] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [about, setAbout] = useState("");

  const toggleExpertise = (item: string) => {
    if (expertise.includes(item)) {
      setExpertise(expertise.filter((x) => x !== item));
      return;
    }

    if (expertise.length < 2) {
      setExpertise([...expertise, item]);
    }
  };

  const addSkill = () => {
    const value = skill.trim();

    if (!value) return;

    if (skills.includes(value)) return;

    setSkills([...skills, value]);
    setSkill("");
  };

  const removeSkill = (item: string) => {
    setSkills(skills.filter((x) => x !== item));
  };

  const canContinue =
    expertise.length > 0 &&
    skills.length > 0 &&
    about.length >= 80;

  return (
    <>

      <h1 className="text-4xl font-bold">
        Profilini oluştur
      </h1>

      <p className="text-gray-500 mt-3">
        Uzmanlık alanlarını ve deneyimini paylaş.
      </p>

      <div className="mt-10 space-y-8">

        {/* Uzmanlık */}

        <div>

          <label className="font-semibold">
            Uzmanlık Alanları
          </label>

          <p className="text-sm text-gray-400 mt-1">
            En fazla 2 alan seçebilirsin.
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            {expertiseOptions.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => toggleExpertise(item)}
                className={`px-4 py-2 rounded-full border transition
                  ${
                    expertise.includes(item)
                      ? "bg-black text-white border-black"
                      : "bg-white hover:bg-gray-50"
                  }`}
              >
                {item}
              </button>
            ))}
          </div>

        </div>

        {/* Yetenekler */}

        <div>

          <label className="font-semibold">
            Yeteneklerin
          </label>

          <div className="flex gap-3 mt-3">

            <input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Örn: Figma"
              className="flex-1 border rounded-xl px-5 py-4"
            />

            <button
              type="button"
              onClick={addSkill}
              className="bg-black text-white px-6 rounded-xl"
            >
              Ekle
            </button>

          </div>

          <div className="flex flex-wrap gap-2 mt-4">

            {skills.map((item) => (
              <span
                key={item}
                className="bg-gray-100 rounded-full px-4 py-2 text-sm flex items-center gap-2"
              >
                {item}

                <button
                  type="button"
                  onClick={() => removeSkill(item)}
                  className="text-gray-400 hover:text-red-500"
                >
                  ×
                </button>

              </span>
            ))}

          </div>

        </div>

        {/* Hakkında */}

        <div>

          <label className="font-semibold">
            Kendinden Bahset
          </label>

          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={6}
            maxLength={500}
            placeholder="Deneyimlerini, uzmanlığını ve çalışma tarzını anlat..."
            className="w-full border rounded-2xl px-5 py-4 mt-3 resize-none"
          />

          <div className="flex justify-between mt-2 text-sm">

            <span
              className={
                about.length >= 80
                  ? "text-green-600"
                  : "text-red-500"
              }
            >
              Minimum 80 karakter
            </span>

            <span className="text-gray-400">
              {about.length}/500
            </span>

          </div>

        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className={`w-full py-4 rounded-full font-semibold transition
            ${
              canContinue
                ? "bg-black text-white"
                : "bg-gray-300 text-white cursor-not-allowed"
            }`}
        >
          Devam Et
        </button>

      </div>

    </>
  );
}