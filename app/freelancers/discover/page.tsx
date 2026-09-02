"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  MapPin,
  Clock3,
  Briefcase,
  Heart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  location: string | null;
  project_type: string | null;
  created_at: string;
  skills: string[] | null;
};

export default function DiscoverPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const supabase = createClient();
    setLoading(true);

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, title, description, budget, location, project_type, created_at, skills"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Projects load error:", error);
      setProjects([]);
    } else {
      setProjects(data ?? []);
    }

    setLoading(false);
  };

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => {
      const searchableText = [
        project.title,
        project.description,
        project.location,
        project.project_type,
        ...(project.skills ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [projects, search]);

  const toggleFavorite = (projectId: string) => {
    setFavorites((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    );
  };

  const formatDate = (date: string) => {
    const createdAt = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Bugün";
    if (diffDays === 1) return "1 gün önce";
    if (diffDays < 7) return `${diffDays} gün önce`;

    return createdAt.toLocaleDateString("tr-TR");
  };

  const formatBudget = (budget: number | null) => {
    if (budget === null || budget === undefined) {
      return "Bütçe belirtilmedi";
    }

    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(budget);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Projeleri Keşfet</h1>
        <p className="mt-2 text-gray-500">
          Sana uygun projeleri keşfet ve hemen teklif gönder.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex gap-4">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <Search size={18} className="text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Proje, teknoloji veya şirket ara..."
              className="w-full outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearch(search.trim())}
            className="rounded-xl bg-black px-8 text-white transition hover:bg-gray-800"
          >
            Ara
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {["Kategori", "Bütçe", "Süre", "Remote", "Deneyim", "Sırala"].map(
            (item) => (
              <button
                key={item}
                type="button"
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition hover:bg-gray-100"
              >
                {item}
                <ChevronDown size={16} />
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-black">
            {filteredProjects.length}
          </span>{" "}
          proje bulundu
        </p>
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm transition hover:bg-gray-100"
        >
          En Yeni
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          Projeler yükleniyor...
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Henüz proje bulunamadı
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Yeni projeler yayınlandığında burada görünecek.
          </p>
        </div>
      )}

      {!loading && filteredProjects.length > 0 && (
        <div className="space-y-5">
          {filteredProjects.map((project) => {
            const isFavorite = favorites.includes(project.id);

            return (
              <div
                key={project.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {project.title}
                    </h2>
                    <p className="mt-1 text-gray-500">HireHub Projesi</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(project.id)}
                    className="rounded-full p-2 transition hover:bg-gray-100"
                    aria-label="Favorilere ekle"
                  >
                    <Heart
                      size={20}
                      fill={isFavorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-6 text-sm text-gray-600">
                  {project.project_type && (
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} />
                      {project.project_type}
                    </div>
                  )}

                  {project.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} />
                      {project.location}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    💰 {formatBudget(project.budget)}
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock3 size={16} />
                    {formatDate(project.created_at)}
                  </div>
                </div>

                {project.skills && project.skills.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {project.description && (
                  <p className="mt-5 leading-7 text-gray-600">
                    {project.description}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <Link
                    href={`/freelancers/discover/${project.id}`}
                    className="rounded-xl border border-gray-200 px-5 py-3 transition hover:bg-gray-100"
                  >
                    Detay
                  </Link>

                  <button
                    type="button"
                    className="rounded-xl bg-black px-6 py-3 text-white transition hover:bg-gray-800"
                  >
                    Teklif Ver
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
