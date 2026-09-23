"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Coalition = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "completed";
  created_by: string;
  created_at: string;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
};

type CoalitionMember = {
  id: string;
  coalition_id: string;
  user_id: string;
  role: "owner" | "member";
  status: "active" | "pending";
  joined_at: string;
  profile: Profile | null;
};

type CoalitionWithMembers = Coalition & {
  members: CoalitionMember[];
};

type FilterType = "all" | "active" | "completed";

export default function CoalitionsPage() {
  const [coalitions, setCoalitions] = useState<
    CoalitionWithMembers[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<FilterType>("active");

  const loadCoalitions = async () => {
    const supabase = createClient();

    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "Koalisyonlarını görmek için giriş yapmalısın."
        );
        setCoalitions([]);
        return;
      }

      /*
       * Önce freelancerın üyesi olduğu koalisyonları buluyoruz.
       *
       * Böylece platformdaki tüm koalisyonlar yerine
       * yalnızca bu freelancerın dahil olduğu koalisyonlar
       * gösterilir.
       */
      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from("coalition_members")
        .select(
          "id, coalition_id, user_id, role, status, joined_at"
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("joined_at", {
          ascending: false,
        });

      if (membershipError) {
        console.error(
          "Coalition membership load error:",
          membershipError
        );

        setErrorMessage(
          "Koalisyonların yüklenmesi sırasında bir hata oluştu."
        );
        setCoalitions([]);
        return;
      }

      if (
        !membershipData ||
        membershipData.length === 0
      ) {
        setCoalitions([]);
        return;
      }

      const coalitionIds = [
        ...new Set(
          membershipData.map(
            (member) => member.coalition_id
          )
        ),
      ];

      /*
       * Sadece freelancerın üyesi olduğu koalisyonları getir.
       */
      const {
        data: coalitionData,
        error: coalitionError,
      } = await supabase
        .from("coalitions")
        .select(
          "id, name, description, status, created_by, created_at"
        )
        .in("id", coalitionIds)
        .order("created_at", {
          ascending: false,
        });

      if (coalitionError) {
        console.error(
          "Coalitions load error:",
          coalitionError
        );

        setErrorMessage(
          "Koalisyonların yüklenmesi sırasında bir hata oluştu."
        );
        setCoalitions([]);
        return;
      }

      if (
        !coalitionData ||
        coalitionData.length === 0
      ) {
        setCoalitions([]);
        return;
      }

      /*
       * Koalisyonlardaki aktif tüm üyeleri getiriyoruz.
       * Böylece kartlarda ekip üyelerini gösterebiliriz.
       */
      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("coalition_members")
        .select(
          "id, coalition_id, user_id, role, status, joined_at"
        )
        .in("coalition_id", coalitionIds)
        .eq("status", "active")
        .order("joined_at", {
          ascending: true,
        });

      if (memberError) {
        console.error(
          "Coalition members load error:",
          memberError
        );

        setErrorMessage(
          "Ekip üyeleri yüklenirken bir hata oluştu."
        );
        setCoalitions([]);
        return;
      }

      const memberUserIds = [
        ...new Set(
          (memberData ?? []).map(
            (member) => member.user_id
          )
        ),
      ];

      let profileData: Profile[] = [];

      if (memberUserIds.length > 0) {
        const {
          data: profiles,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, avatar_url, title"
          )
          .in("id", memberUserIds);

        if (profileError) {
          console.error(
            "Profiles load error:",
            profileError
          );
        } else {
          profileData = profiles ?? [];
        }
      }

      const normalizedMembers: CoalitionMember[] =
        (memberData ?? []).map((member) => {
          const profile =
            profileData.find(
              (item) =>
                item.id === member.user_id
            ) ?? null;

          return {
            id: member.id,
            coalition_id: member.coalition_id,
            user_id: member.user_id,
            role: member.role,
            status: member.status,
            joined_at: member.joined_at,
            profile,
          };
        });

      const combined: CoalitionWithMembers[] =
        coalitionData.map((coalition) => ({
          ...coalition,
          members:
            normalizedMembers.filter(
              (member) =>
                member.coalition_id ===
                coalition.id
            ),
        }));

      setCoalitions(combined);
    } catch (error) {
      console.error(
        "Coalitions page error:",
        error
      );

      setErrorMessage(
        "Koalisyonlar yüklenirken beklenmeyen bir hata oluştu."
      );

      setCoalitions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCoalitions();
  }, []);

  const filteredCoalitions = useMemo(() => {
    const normalizedSearch =
      search.trim().toLocaleLowerCase("tr-TR");

    return coalitions.filter((coalition) => {
      const matchesFilter =
        activeFilter === "all" ||
        coalition.status === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        coalition.name,
        coalition.description ?? "",
        ...coalition.members.map(
          (member) =>
            member.profile?.first_name ?? ""
        ),
        ...coalition.members.map(
          (member) =>
            member.profile?.last_name ?? ""
        ),
        ...coalition.members.map(
          (member) =>
            member.profile?.title ?? ""
        ),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(
        normalizedSearch
      );
    });
  }, [
    coalitions,
    activeFilter,
    search,
  ]);

  const activeCount = coalitions.filter(
    (coalition) =>
      coalition.status === "active"
  ).length;

  const completedCount = coalitions.filter(
    (coalition) =>
      coalition.status === "completed"
  ).length;

  const formatDate = (date: string) => {
    return new Date(
      date
    ).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getMemberName = (
    member: CoalitionMember
  ) => {
    const firstName =
      member.profile?.first_name ?? "";

    const lastName =
      member.profile?.last_name ?? "";

    const fullName =
      `${firstName} ${lastName}`.trim();

    return fullName || "Kullanıcı";
  };

  const getAvatar = (
    member: CoalitionMember
  ) => {
    return (
      member.profile?.avatar_url || null
    );
  };

  return (
    <main className="w-full p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Koalisyonlarım
          </h1>

          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <Sparkles size={13} />
            AI destekli
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Dahil olduğun projelerdeki ekiplerini,
          ekip üyelerini ve koalisyon çalışmalarını
          buradan takip edebilirsin.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Koalisyon veya ekip üyesi ara..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              activeFilter === "all"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tümü ({coalitions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("active")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              activeFilter === "active"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Aktif ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("completed")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              activeFilter === "completed"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tamamlanan ({completedCount})
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Koalisyonların yükleniyor...
        </div>
      )}

      {/* Error */}
      {!loading && errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
          <h2 className="font-medium text-red-800">
            Koalisyonlar yüklenemedi
          </h2>
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadCoalitions()}
            className="mt-5 rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm text-white transition hover:bg-[var(--color-primary-700)]"
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading &&
        !errorMessage &&
        filteredCoalitions.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {search
                ? "Aradığın koalisyon bulunamadı"
                : activeFilter === "completed"
                  ? "Tamamlanan koalisyonun yok"
                  : "Henüz bir koalisyona dahil değilsin"}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {search
                ? "Farklı bir koalisyon adı veya ekip üyesi deneyebilirsin."
                : "Bir projeye seçildiğinde veya bir koalisyon davetini kabul ettiğinde burada görüntülenecek."}
            </p>
          </div>
        )}

      {/* Coalition List */}
      {!loading &&
        !errorMessage &&
        filteredCoalitions.length > 0 && (
          <div className="space-y-5">
            {filteredCoalitions.map((coalition) => (
              <div
                key={coalition.id}
                className="flex w-full items-center justify-between gap-6 rounded-xl border border-gray-200 bg-white p-5 transition hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {coalition.name}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        coalition.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {coalition.status === "active" ? "Aktif" : "Tamamlandı"}
                    </span>
                  </div>

                  <p className="mb-5 line-clamp-2 text-sm text-gray-500">
                    {coalition.description || "Açıklama eklenmemiş."}
                  </p>

                  <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
                    <div>
                      <span className="mb-1 block text-gray-400">Ekip</span>

                      <div className="flex items-center">
                        {coalition.members.length === 0 && (
                          <span className="font-medium text-gray-900">Henüz üye yok</span>
                        )}

                        {coalition.members.slice(0, 4).map((member, index) => {
                          const avatar = getAvatar(member);

                          return (
                            <div
                              key={member.id}
                              title={getMemberName(member)}
                              className={index > 0 ? "-ml-2" : ""}
                            >
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt={getMemberName(member)}
                                  className="h-7 w-7 rounded-full border-2 border-white object-cover"
                                />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600">
                                  {getMemberName(member).charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {coalition.members.length > 4 && (
                          <span className="ml-2 text-xs text-gray-500">
                            +{coalition.members.length - 4}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="mb-1 block text-gray-400">Üye Sayısı</span>
                      <span className="font-medium text-gray-900">
                        {coalition.members.length} kişi
                      </span>
                    </div>

                    <div>
                      <span className="mb-1 block text-gray-400">Oluşturulma Tarihi</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(coalition.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 gap-3">
                  <Link
                    href={`/freelancers/coalitions/${coalition.id}`}
                    className="rounded-xl bg-[var(--color-primary-600)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                  >
                    Detayları Gör
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
    </main>
  );
}