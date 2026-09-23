"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FolderPlus,
  Loader2,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uniqueSkills } from "@/lib/matching";
import { EmptyState } from "@/components/common/EmptyState";

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
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-neutral-900">
              Koalisyonlarım
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Projeleriniz için oluşturduğunuz ekipleri yönetin.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void openCreateModal()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
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
          <EmptyState
            icon={UsersRound}
            title="Henüz bir koalisyon oluşturmadınız"
            description="Bir projeniz için ekip oluşturarak freelancer önerilerini yönetmeye başlayabilirsiniz."
          />
        ) : (
          <div className="grid gap-[var(--rhythm-card-gap)] md:grid-cols-2 xl:grid-cols-3">
            {coalitions.map((coalition) => (
              <Link
                key={coalition.id}
                href={`/client/coalitions/${coalition.id}`}
                className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-base font-semibold text-neutral-900">
                    {coalition.name}
                  </h2>

                  {/* Bu sayfa zaten yalnızca status="active" koalisyonları getiriyor
                      (bkz. yukarıdaki sorgu), bu yüzden rozet ek bir alan çekmeden
                      güvenle "Aktif" gösterebilir. */}
                  <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    Aktif
                  </span>
                </div>

                <p className="mt-[var(--rhythm-title-gap)] line-clamp-2 text-sm leading-6 text-neutral-500">
                  {coalition.description || "Açıklama eklenmemiş."}
                </p>

                <div className="mt-[var(--rhythm-group-gap)] flex min-h-7 flex-wrap items-start gap-2">
                  {coalition.skills.length > 0 ? (
                    <>
                      {coalition.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700"
                        >
                          {skill}
                        </span>
                      ))}

                      {coalition.skills.length > 4 && (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">
                          +{coalition.skills.length - 4}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-neutral-400">Ekip yeteneği henüz eklenmemiş.</span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-[var(--rhythm-group-gap)]">
                  <span className="text-sm text-neutral-600">{coalition.memberCount} aktif üye</span>

                  <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-600)] px-3.5 py-2 text-sm font-medium text-white">
                    Detayları Gör
                  </span>
                </div>
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
                <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 p-5 text-sm text-neutral-500">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Projeleriniz yükleniyor...
                </div>
              ) : projects.length === 0 ? (
                <EmptyState
                  icon={FolderPlus}
                  title="Henüz bir projeniz yok"
                  description="Önce bir proje oluşturmanız gerekiyor."
                  action={
                    <Link
                      href="/client/create-project"
                      onClick={closeCreateModal}
                      className="inline-flex h-[var(--button-height-sm)] items-center justify-center rounded-lg bg-[var(--color-primary-600)] px-3 text-[13px] font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                    >
                      Proje Oluştur
                    </Link>
                  }
                />
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
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
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
