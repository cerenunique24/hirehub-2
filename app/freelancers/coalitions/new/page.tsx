"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Freelancer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
  expertise: string | null;
};

export default function NewCoalitionPage() {
  const router = useRouter();
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [freelancers, setFreelancers] =
    useState<Freelancer[]>([]);

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    const loadFreelancers = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMessage(
            "Koalisyon oluşturmak için giriş yapmalısın."
          );
          return;
        }

        setCurrentUserId(user.id);

        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, avatar_url, title, expertise"
          )
          .eq("role", "freelancer")
          .neq("id", user.id)
          .order("first_name", {
            ascending: true,
          });

        if (error) {
          console.error(
            "Freelancers load error:",
            error
          );

          setErrorMessage(
            "Freelancerlar yüklenirken bir hata oluştu."
          );
          return;
        }

        setFreelancers(
          (data ?? []) as Freelancer[]
        );
      } catch (error) {
        console.error(
          "New coalition page error:",
          error
        );

        setErrorMessage(
          "Freelancerlar yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadFreelancers();
  }, [supabase]);

  const getName = (freelancer: Freelancer) => {
    const fullName = [
      freelancer.first_name,
      freelancer.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || "İsimsiz Freelancer";
  };

  const getInitial = (
    freelancer: Freelancer
  ) => {
    return getName(freelancer)
      .charAt(0)
      .toUpperCase();
  };

  const filteredFreelancers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedSearch) {
      return freelancers;
    }

    return freelancers.filter(
      (freelancer) => {
        const searchableText = [
          getName(freelancer),
          freelancer.title ?? "",
          freelancer.expertise ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("tr-TR");

        return searchableText.includes(
          normalizedSearch
        );
      }
    );
  }, [freelancers, search]);

  const toggleFreelancer = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      return [...current, id];
    });
  };

  const handleCreate = async () => {
    setErrorMessage("");

    const trimmedName = name.trim();
    const trimmedDescription =
      description.trim();

    if (!trimmedName) {
      setErrorMessage(
        "Koalisyon adı girmelisin."
      );
      return;
    }

    if (!currentUserId) {
      setErrorMessage(
        "Kullanıcı bilgilerin alınamadı. Lütfen tekrar giriş yap."
      );
      return;
    }

    setCreating(true);

    try {
      const {
        data: coalition,
        error: coalitionError,
      } = await supabase
        .from("coalitions")
        .insert({
          name: trimmedName,
          description:
            trimmedDescription || null,
          status: "active",
          created_by: currentUserId,
        })
        .select(
          "id, name, description, status, created_by, created_at"
        )
        .single();

      if (coalitionError || !coalition) {
        console.error(
          "Coalition create error:",
          coalitionError
        );

        setErrorMessage(
          coalitionError?.message ||
            "Koalisyon oluşturulamadı."
        );
        return;
      }

      const members = [
        {
          coalition_id: coalition.id,
          user_id: currentUserId,
          role: "owner",
          status: "active",
        },
        ...selectedIds.map((userId) => ({
          coalition_id: coalition.id,
          user_id: userId,
          role: "member",
          status: "active",
        })),
      ];

      const {
        error: membersError,
      } = await supabase
        .from("coalition_members")
        .insert(members);

      if (membersError) {
        console.error(
          "Coalition members create error:",
          membersError
        );

        await supabase
          .from("coalitions")
          .delete()
          .eq("id", coalition.id);

        setErrorMessage(
          membersError.message ||
            "Koalisyon üyeleri eklenemedi. Koalisyon oluşturulmadı."
        );

        return;
      }

      router.push(
        `/freelancers/coalitions/${coalition.id}`
      );
    } catch (error) {
      console.error(
        "Coalition creation error:",
        error
      );

      setErrorMessage(
        "Koalisyon oluşturulurken beklenmeyen bir hata oluştu."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="w-full p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/freelancers/coalitions"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Koalisyonlara dön
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Koalisyon Oluştur
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Birlikte çalışmak istediğin
            freelancerları seçerek kendi ekibini
            oluştur.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Koalisyon bilgileri
            </h2>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="coalition-name"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Koalisyon adı
                </label>

                <input
                  id="coalition-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Örn. Product Design Ekibi"
                  maxLength={100}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-400"
                />
              </div>

              <div>
                <label
                  htmlFor="coalition-description"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Açıklama
                </label>

                <textarea
                  id="coalition-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Ekibinizin hangi alanlarda çalıştığını anlat..."
                  rows={6}
                  maxLength={500}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
                />

                <p className="mt-2 text-right text-xs text-gray-400">
                  {description.length}/500
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <Users
                  size={18}
                  className="mt-0.5 text-gray-500"
                />

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Ekip sahibi sensin
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Koalisyonu oluşturan freelancer
                    otomatik olarak ekip sahibi olur.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Ekip üyeleri
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Koalisyonda birlikte çalışmak
                  istediğin freelancerları seç.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {selectedIds.length} seçildi
              </span>
            </div>

            <div className="relative mt-5">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Freelancer ara..."
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400"
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedIds.map((id) => {
                  const freelancer =
                    freelancers.find(
                      (item) => item.id === id
                    );

                  if (!freelancer) {
                    return null;
                  }

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        toggleFreelancer(id)
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                      {getName(freelancer)}
                      <X size={13} />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5">
              {loading ? (
                <div className="rounded-xl bg-gray-50 p-10 text-center">
                  <Loader2
                    size={22}
                    className="mx-auto animate-spin text-gray-400"
                  />

                  <p className="mt-3 text-sm text-gray-500">
                    Freelancerlar yükleniyor...
                  </p>
                </div>
              ) : filteredFreelancers.length ===
                0 ? (
                <div className="rounded-xl bg-gray-50 p-6 text-center">
                  <Users
                    size={22}
                    className="mx-auto text-gray-400"
                  />

                  <p className="mt-3 text-sm font-medium text-gray-700">
                    Freelancer bulunamadı
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Farklı bir isim veya uzmanlık
                    alanı deneyebilirsin.
                  </p>
                </div>
              ) : (
                <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                  {filteredFreelancers.map(
                    (freelancer) => {
                      const selected =
                        selectedIds.includes(
                          freelancer.id
                        );

                      return (
                        <button
                          key={freelancer.id}
                          type="button"
                          onClick={() =>
                            toggleFreelancer(
                              freelancer.id
                            )
                          }
                          className={
                            selected
                              ? "flex w-full items-center justify-between rounded-xl border border-gray-300 bg-gray-50 p-4 text-left transition"
                              : "flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-gray-300 hover:bg-gray-50"
                          }
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {freelancer.avatar_url ? (
                              <img
                                src={
                                  freelancer.avatar_url
                                }
                                alt={getName(
                                  freelancer
                                )}
                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                                {getInitial(
                                  freelancer
                                )}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {getName(
                                  freelancer
                                )}
                              </p>

                              <p className="mt-1 truncate text-xs text-gray-500">
                                {freelancer.title ||
                                  freelancer.expertise ||
                                  "Freelancer"}
                              </p>
                            </div>
                          </div>

                          <div
                            className={
                              selected
                                ? "ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white"
                                : "ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-transparent"
                            }
                          >
                            <Check size={14} />
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/freelancers/coalitions"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Vazgeç
          </Link>

          <button
            type="button"
            onClick={handleCreate}
            disabled={
              creating ||
              loading ||
              !name.trim()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-6 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {creating
              ? "Koalisyon oluşturuluyor..."
              : "Koalisyonu Oluştur"}
          </button>
        </div>
      </div>
    </main>
  );
}