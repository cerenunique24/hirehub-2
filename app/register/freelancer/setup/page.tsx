"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  "UI/UX Design",
  "Graphic Design",
  "Web Design",
  "Frontend Development",
  "Backend Development",
  "Full Stack Development",
  "Mobile App Development",
  "WordPress",
  "3D Modeling",
  "Interior Design",
  "Video Editing",
  "Digital Marketing",
  "Content Writing",
];

const prices = [
  "₺250 / saat",
  "₺500 / saat",
  "₺750 / saat",
  "₺1.000 / saat",
  "₺1.250 / saat",
  "₺1.500 / saat",
  "₺2.000 / saat",
  "₺2.500 / saat",
  "₺3.000+ / saat",
];

export default function FreelancerSetupPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");

  const [skillInput, setSkillInput] = useState("");

  const [skills, setSkills] = useState<string[]>([]);

  const [about, setAbout] = useState("");

  const [price, setPrice] = useState("");

  function addSkill(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const value = skillInput.trim();

    if (!value) return;

    if (skills.includes(value)) return;

    if (skills.length >= 10) return;

    setSkills([...skills, value]);

    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }
  return (
    <main className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-6 py-12">

      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-sm p-10">

        <h1 className="text-3xl font-bold">
          Profilini Tamamla
        </h1>

        <p className="text-gray-500 mt-2 mb-10">
          Freelancer profilini oluşturmak için birkaç bilgi daha gerekiyor.
        </p>

        <div className="space-y-8">

          <div>

            <label className="block font-medium mb-2">
              Uzmanlık Alanı
            </label>

            <select
              value={category}
              onChange={(e)=>setCategory(e.target.value)}
              className="w-full h-12 border rounded-xl px-4"
            >

              <option value="">
                Uzmanlık alanı seç
              </option>

              {categories.map((item)=>(
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}

            </select>

          </div>

          <div>

            <label className="block font-medium mb-2">
              Yetenekler
            </label>

            <input
              value={skillInput}
              onChange={(e)=>setSkillInput(e.target.value)}
              onKeyDown={addSkill}
              placeholder="Figma, React, Next.js..."
              className="w-full h-12 border rounded-xl px-4"
            />

            <div className="flex flex-wrap gap-2 mt-4">

              {skills.map((skill)=>(

                <div
                  key={skill}
                  className="bg-black text-white rounded-full px-4 py-2 text-sm flex items-center gap-2"
                >

                  {skill}

                  <button
                    type="button"
                    onClick={()=>removeSkill(skill)}
                  >
                    ×
                  </button>

                </div>

              ))}

            </div>

          </div>

          <div>

<label className="block font-medium mb-2">
  Kendini Tanıt
</label>

<textarea
  value={about}
  onChange={(e) => setAbout(e.target.value)}
  maxLength={600}
  rows={6}
  placeholder="Kendinden, deneyimlerinden ve çalışma tarzından bahset..."
  className="w-full border rounded-xl px-4 py-3 resize-none"
/>

<div className="flex justify-between mt-2 text-sm text-gray-500">

  <span>Minimum 80 karakter önerilir.</span>

  <span>{about.length}/600</span>

</div>

</div>

<div>

<label className="block font-medium mb-2">
  Saatlik Ücret
</label>

<select
  value={price}
  onChange={(e) => setPrice(e.target.value)}
  className="w-full h-12 border rounded-xl px-4"
>

  <option value="">
    Saatlik ücret seç
  </option>

  {prices.map((item) => (

    <option
      key={item}
      value={item}
    >
      {item}
    </option>

  ))}

</select>

</div>

<div className="flex justify-between pt-6">

<button
  type="button"
  onClick={() => history.back()}
  className="px-6 py-3 rounded-xl border font-medium hover:bg-gray-100 transition"
>
  Geri
</button>

<button
  type="button"
  onClick={() => router.push("/register/freelancer/verify")}
  disabled={
    !category ||
    skills.length === 0 ||
    about.length < 80 ||
    !price
  }
  className={`px-8 py-3 rounded-xl font-semibold transition ${
    category &&
    skills.length > 0 &&
    about.length >= 80 &&
    price
      ? "bg-black text-white hover:bg-gray-900"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"
  }`}
>
  Profili Tamamla
</button>

</div>

</div>

</div>

</main>
);
}
