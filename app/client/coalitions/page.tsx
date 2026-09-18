"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uniqueSkills } from "@/lib/matching";

type Coalition = {
  id: string;
  name: string;
  description: string | null;
};

type Member = {
  coalition_id: string;
  user_id: string;
};

type Profile = {
  id: string;
  skills: string[] | null;
};

type Project = {
  id: string;
  title: string;
  status: string;
};

export default function ClientCoalitionsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [coalitions, setCoalitions] = useState<
    Array<Coalition & { memberCount: number; skills: string[] }>
  >([]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [coalitionName, setCoalitionName] = useState("");
  const [coalitionDescription, setCoalitionDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    async function loadCoalitions() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Koalisyonları görmek için giriş yapmalısınız.");
        setLoading(false);
        return;
      }

      const { data: rows, error: coalitionError } = await supabase
        .from("coalitions")
        .select("id, name, description")
        .eq("status", "active")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (coalitionError) {
        setError(
          "Koalisyonlar yüklenemedi. Yetkilendirme ayarlarını kontrol edin."
        );
        setLoading(false);
        return;
      }

      const base = (rows ?? []) as Coalition[];

      if (!base.length) {
        setCoalitions([]);
        setLoading(false);
        return;
      }

      const { data: memberRows, error: memberError } = await supabase
        .from("coalition_members")
        .select("coalition_id, user_id")
        .in(
          "coalition_id",
          base.map((coalition) => coalition.id)
        )
        .eq("status", "active");

      if (memberError) {
        setError("Koalisyon üyeleri yüklenemedi.");
        setLoading(false);
        return;
      }

      const members = (memberRows ?? []) as Member[];

      const userIds = [
        ...new Set(members.map((member) => member.user_id)),
      ];

      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, skills")
            .in("id", userIds)
        : { data: [] };

      const profileById = new Map(
        ((profiles ?? []) as Profile[]).map((profile) => [
          profile.id,
          profile,
        ])
      );

      setCoalitions(
        base.map((coalition) => {
          const activeMembers = members.filter(
            (member) => member.coalition_id === coalition.id
          );

          return {
            ...coalition,
            memberCount: activeMembers.length,
            skills: uniqueSkills(
              activeMembers.map(
                (member) =>
                  profileById.get(member.user_id)?.skills
              )
            ),
          };
        })
      );

      setLoading(false);
    }

    void loadCoalitions();
  }, [supabase]);

  const openCreateModal = async () => {
    setCreateError("");
    setCoalitionName("");
    setCoalitionDescription("");
    setSelectedProjectId("");
    setShowCreateModal(true);
    setLoadingProjects(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCreateError("Koalisyon oluşturmak için giriş yapmalısınız.");
      setLoadingProjects(false);
      return;
    }

    const { data, error: projectError } = await supabase
      .from("projects")
      .select("id, title, status")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (projectError) {
      setCreateError("Projeleriniz yüklenemedi.");
      setLoadingProjects(false);
      return;
    }

    setProjects((data ?? []) as Project[]);
    setLoadingProjects(false);
  };

  const closeCreateModal = () => {
    if (creating) return;

    setShowCreateModal(false);
    setCreateError("");
    setCoalitionName("");
    setCoalitionDescription("");
    setSelectedProjectId("");
  };

  const createCoalition = async () => {
    setCreateError("");

    if (!selectedProjectId) {
      setCreateError("Lütfen bir proje seçin.");
      return;
    }

    if (!coalitionName.trim()) {
      setCreateError("Koalisyon adı girin.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCreateError("Koalisyon oluşturmak için giriş yapmalısınız.");
      return;
    }

    const selectedProject = projects.find(
      (project) => project.id === selectedProjectId
    );

    if (!selectedProject) {
      setCreateError("Seçilen proje bulunamadı.");
      return;
    }

    setCreating(true);

    const { data, error: insertError } = await supabase
      .from("coalitions")
      .insert({
        project_id: selectedProject.id,
        created_by: user.id,
        name: coalitionName.trim(),
        description: coalitionDescription.trim() || null,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setCreateError(
        insertError?.message ||
          "Koalisyon oluşturulurken bir hata oluştu."
      );
      setCreating(false);
      return;
    }

    window.location.href = `/client/coalitions/${data.id}`;
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">
              Koalisyonlarım
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Projeleriniz için oluşturduğunuz ekipleri yönetin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void openCreateModal()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            <Plus size={17} />
            Koalisyon Oluştur
          </button>
        </header>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-neutral-500">
            <Loader2 size={18} className="animate-spin" />
            Koalisyonlar yükleniyor...
          </div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : coalitions.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center">
            <UsersRound className="mx-auto text-neutral-400" />

            <h2 className="mt-4 text-lg font-semibold">
              Henüz bir koalisyon oluşturmadınız
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Bir projeniz için ekip oluşturarak freelancer önerilerini
              yönetmeye başlayabilirsiniz.
            </p>

            <button
              type="button"
              onClick={() => void openCreateModal()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <Plus size={17} />
              İlk Koalisyonu Oluştur
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {coalitions.map((coalition) => (
              <Link
                key={coalition.id}
                href={`/client/coalitions/${coalition.id}`}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <h2 className="font-semibold text-neutral-900">
                  {coalition.name}
                </h2>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">
                  {coalition.description ||
                    "Açıklama eklenmemiş."}
                </p>

                <p className="mt-5 text-sm text-neutral-600">
                  {coalition.memberCount} aktif üye
                </p>

                {coalition.skills.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {coalition.skills
                      .slice(0, 6)
                      .map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-neutral-500">
                    Ekip yeteneği henüz eklenmemiş.
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Koalisyon Oluştur
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Koalisyonu bir projenize bağlayın.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                aria-label="Pencereyi kapat"
                className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              {loadingProjects ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 p-6 text-sm text-neutral-500">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Projeleriniz yükleniyor...
                </div>
              ) : projects.length === 0 ? (
                <div className="rounded-xl bg-neutral-50 p-5 text-center">
                  <p className="text-sm font-medium text-neutral-800">
                    Henüz bir projeniz yok.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    Önce bir proje oluşturmanız gerekiyor.
                  </p>

                  <Link
                    href="/client/create-project"
                    onClick={closeCreateModal}
                    className="mt-4 inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >
                    Proje Oluştur
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-neutral-900">
                      Proje
                    </label>

                    <select
                      value={selectedProjectId}
                      onChange={(event) =>
                        setSelectedProjectId(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                    >
                      <option value="">
                        Proje seçin
                      </option>

                      {projects.map((project) => (
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-900">
                      Koalisyon adı
                    </label>

                    <input
                      type="text"
                      value={coalitionName}
                      onChange={(event) =>
                        setCoalitionName(event.target.value)
                      }
                      placeholder="Örn. Mobil Uygulama Ekibi"
                      className="mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-900">
                      Açıklama
                    </label>

                    <textarea
                      value={coalitionDescription}
                      onChange={(event) =>
                        setCoalitionDescription(event.target.value)
                      }
                      rows={4}
                      placeholder="Bu koalisyonun amacı ve ekip yapısı hakkında kısa bilgi..."
                      className="mt-2 w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400"
                    />
                  </div>
                </>
              )}

              {createError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {createError}
                </div>
              )}
            </div>

            {projects.length > 0 && !loadingProjects && (
              <div className="flex justify-end gap-3 border-t border-neutral-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  onClick={() => void createCoalition()}
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}
                  {creating
                    ? "Oluşturuluyor..."
                    : "Koalisyonu Oluştur"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
