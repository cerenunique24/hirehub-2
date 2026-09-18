"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type EditableProject = {
  id: string;
  title: string;
  description: string | null;
  budget: number | null;
  budget_max: number | null;
  skills: string[] | null;
  requirements: string[] | null;
  status: string | null;
  deliverables: string[] | null;
  deadline: string | null;
};

const supabase = createClient();

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();

  const projectId = String(params.id);

  const [project, setProject] =
    useState<EditableProject | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const [deliverables, setDeliverables] =
    useState<string[]>([]);
  const [deliverableInput, setDeliverableInput] =
    useState("");

  const [requirements, setRequirements] =
    useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] =
    useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error: projectError } =
        await supabase
          .from("projects")
          .select(
            [
              "id",
              "title",
              "description",
              "budget",
              "budget_max",
              "skills",
              "requirements",
              "status",
              "deliverables",
              "deadline",
            ].join(", ")
          )
          .eq("id", projectId)
          .eq("client_id", user.id)
          .single();

      if (projectError) {
        throw projectError;
      }

      const currentProject =
        data as unknown as EditableProject;

      setProject(currentProject);

      setTitle(currentProject.title ?? "");

      setDescription(
        currentProject.description ?? ""
      );

      setBudget(
        currentProject.budget_max?.toString() ??
          currentProject.budget?.toString() ??
          ""
      );

      setDeadline(currentProject.deadline ?? "");

      setSkills(currentProject.skills ?? []);

      setRequirements(
        currentProject.requirements ?? []
      );

      setDeliverables(
        currentProject.deliverables ?? []
      );
    } catch (err) {
      console.error(err);

      setError(
        "Proje bilgileri yüklenirken bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  function addSkill() {
    const value = skillInput.trim();

    if (!value) return;

    const exists = skills.some(
      (skill) =>
        skill.toLocaleLowerCase("tr-TR") ===
        value.toLocaleLowerCase("tr-TR")
    );

    if (!exists) {
      setSkills((current) => [
        ...current,
        value,
      ]);
    }

    setSkillInput("");
  }

  function removeSkill(skillToRemove: string) {
    setSkills((current) =>
      current.filter(
        (skill) => skill !== skillToRemove
      )
    );
  }

  function addDeliverable() {
    const value = deliverableInput.trim();

    if (!value) return;

    const exists = deliverables.some(
      (deliverable) =>
        deliverable.toLocaleLowerCase("tr-TR") ===
        value.toLocaleLowerCase("tr-TR")
    );

    if (!exists) {
      setDeliverables((current) => [
        ...current,
        value,
      ]);
    }

    setDeliverableInput("");
  }

  function removeDeliverable(item: string) {
    setDeliverables((current) =>
      current.filter(
        (deliverable) => deliverable !== item
      )
    );
  }

  async function saveProject() {
    if (!title.trim()) {
      setError(
        "Proje başlığı boş bırakılamaz."
      );
      return;
    }

    if (!description.trim()) {
      setError(
        "Proje açıklaması boş bırakılamaz."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const amount = Number(budget);

      const {
        data,
        error: updateError,
      } = await supabase
        .from("projects")
        .update({
          title: title.trim(),
          description: description.trim(),

          budget:
            Number.isFinite(amount) &&
            amount > 0
              ? amount
              : null,

          budget_max:
            Number.isFinite(amount) &&
            amount > 0
              ? amount
              : null,

          deadline:
            deadline || null,

          skills,

          requirements:
            requirements.filter(Boolean),

          deliverables,
        })
        .eq("id", projectId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setProject(
        data as unknown as EditableProject
      );

      setSuccess(
        "Proje başarıyla güncellendi."
      );

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Proje güncellenirken bir hata oluştu."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateProjectStatus() {
    if (!project) return;

    setStatusUpdating(true);
    setError("");
    setSuccess("");

    const nextStatus =
      project.status === "paused"
        ? "open"
        : "paused";

    try {
      const { error: updateError } =
        await supabase
          .from("projects")
          .update({
            status: nextStatus,
          })
          .eq("id", project.id);

      if (updateError) {
        throw updateError;
      }

      setProject((current) =>
        current
          ? {
              ...current,
              status: nextStatus,
            }
          : current
      );

      setSuccess(
        nextStatus === "paused"
          ? "Proje duraklatıldı."
          : "Proje yeniden yayınlandı."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Proje durumu güncellenemedi."
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  async function deleteProject() {
    if (!project) return;

    setDeleting(true);
    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from("projects")
          .delete()
          .eq("id", project.id);

      if (deleteError) {
        throw deleteError;
      }

      router.push("/client/projects");
    } catch (err) {
      console.error(err);

      setError("Proje silinemedi.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Proje yükleniyor...
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <div className="text-center">
          <p className="text-lg font-semibold text-neutral-900">
            Proje bulunamadı
          </p>

          <Link
            href="/client/projects"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#e60000]"
          >
            <ArrowLeft className="h-4 w-4" />
            Projelere dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <main className="mx-auto w-full max-w-[1180px] px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href={"/client/projects/" + project.id}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Projeye dön
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={updateProjectStatus}
              disabled={statusUpdating}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : project.status === "paused" ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}

              {project.status === "paused"
                ? "Projeyi yeniden yayınla"
                : "Projeyi duraklat"}
            </button>

            <button
              type="button"
              onClick={() =>
                setShowDeleteModal(true)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Sil
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
            <span>Projeler</span>
            <ChevronRight className="h-4 w-4" />
            <span>Düzenle</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
            Proje bilgilerini düzenle
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Projenin mevcut bilgilerini,
            yeteneklerini, gereksinimlerini ve
            teslimatlarını güncelleyebilirsin.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="grid gap-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-neutral-950">
                Proje bilgileri
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Mevcut proje bilgilerini güncelle.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-800">
                  Proje adı
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900"
                  placeholder="Örn. Mobil uygulama UI/UX tasarımı"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-800">
                  Proje açıklaması
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={7}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900"
                  placeholder="Projenizi, hedefinizi ve neye ihtiyaç duyduğunuzu anlatın..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800">
                    Bütçe
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={budget}
                      onChange={(event) =>
                        setBudget(event.target.value)
                      }
                      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 pr-16 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                      placeholder="50000"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                      TL
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800">
                    Son teslim tarihi
                  </label>

                  <input
                    type="date"
                    value={deadline}
                    onChange={(event) =>
                      setDeadline(event.target.value)
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-neutral-950">
                Proje ihtiyaçları
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Projede ihtiyaç duyulan yetenekleri
                ve gereksinimleri manuel olarak
                güncelleyebilirsin.
              </p>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Gerekli yetenekler
              </label>

              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={(event) =>
                    setSkillInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSkill();
                    }
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
                  placeholder="Örn. Figma"
                />

                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Ekle
                </button>
              </div>

              {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700"
                    >
                      {skill}

                      <button
                        type="button"
                        onClick={() =>
                          removeSkill(skill)
                        }
                        className="text-neutral-400 transition hover:text-neutral-800"
                        aria-label={
                          skill + " kaldır"
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Gereksinimler
              </label>

              <div className="space-y-2">
                {requirements.length > 0 ? (
                  requirements.map(
                    (requirement) => (
                      <div
                        key={requirement}
                        className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700"
                      >
                        {requirement}
                      </div>
                    )
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-4 text-sm text-neutral-400">
                    Henüz özel bir gereksinim eklenmemiş.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-neutral-950">
                Teslimatlar
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Proje sonunda ortaya çıkmasını
                beklediğin çıktılar.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={deliverableInput}
                onChange={(event) =>
                  setDeliverableInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDeliverable();
                  }
                }}
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
                placeholder="Örn. Figma tasarım dosyası"
              />

              <button
                type="button"
                onClick={addDeliverable}
                className="rounded-xl border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Ekle
              </button>
            </div>

            {deliverables.length > 0 && (
              <div className="mt-4 space-y-2">
                {deliverables.map(
                  (deliverable) => (
                    <div
                      key={deliverable}
                      className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-4 py-3"
                    >
                      <span className="text-sm text-neutral-700">
                        {deliverable}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeDeliverable(
                            deliverable
                          )
                        }
                        className="text-neutral-400 transition hover:text-red-600"
                        aria-label={
                          deliverable + " kaldır"
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={"/client/projects/" + project.id}
            className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-neutral-600 transition hover:bg-white hover:text-neutral-900"
          >
            Vazgeç
          </Link>

          <button
            type="button"
            onClick={saveProject}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e60000] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c90000] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving
              ? "Kaydediliyor..."
              : "Değişiklikleri kaydet"}
          </button>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-neutral-950">
              Projeyi silmek istediğine emin misin?
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Bu işlem geri alınamaz. Projeye ait
              mevcut bilgiler silinecek.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                disabled={deleting}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={deleteProject}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Projeyi sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
