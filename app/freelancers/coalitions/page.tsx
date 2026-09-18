"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  CalendarDays,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
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
    <main className="w-full p-8">
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

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Dahil olduğun projelerdeki ekiplerini,
          ekip üyelerini ve koalisyon çalışmalarını
          buradan takip edebilirsin.
        </p>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() =>
              setActiveFilter("all")
            }
            className={
              activeFilter === "all"
                ? "whitespace-nowrap rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition"
                : "whitespace-nowrap rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            }
          >
            Tümü ({coalitions.length})
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveFilter("active")
            }
            className={
              activeFilter === "active"
                ? "whitespace-nowrap rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition"
                : "whitespace-nowrap rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            }
          >
            Aktif ({activeCount})
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveFilter("completed")
            }
            className={
              activeFilter === "completed"
                ? "whitespace-nowrap rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition"
                : "whitespace-nowrap rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            }
          >
            Tamamlanan ({completedCount})
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Loader2
            size={24}
            className="mx-auto animate-spin text-gray-400"
          />

          <p className="mt-4 text-sm text-gray-500">
            Koalisyonların yükleniyor...
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading &&
        filteredCoalitions.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Users
                size={22}
                className="text-gray-500"
              />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              {search
                ? "Aradığın koalisyon bulunamadı"
                : activeFilter === "completed"
                  ? "Tamamlanan koalisyonun yok"
                  : "Henüz bir koalisyona dahil değilsin"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              {search
                ? "Farklı bir koalisyon adı veya ekip üyesi deneyebilirsin."
                : "Bir projeye seçildiğinde veya bir koalisyon davetini kabul ettiğinde burada görüntülenecek."}
            </p>
          </div>
        )}

      {/* Coalition List */}
      {!loading &&
        filteredCoalitions.length > 0 && (
          <div className="w-full space-y-5">
            {filteredCoalitions.map(
              (coalition) => (
                <div
                  key={coalition.id}
                  className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {coalition.name}
                        </h2>

                        <span
                          className={
                            coalition.status ===
                            "active"
                              ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                              : "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                          }
                        >
                          {coalition.status ===
                          "active"
                            ? "Aktif"
                            : "Tamamlandı"}
                        </span>
                      </div>

                      {coalition.description && (
                        <p className="mb-5 max-w-3xl text-sm leading-6 text-gray-500">
                          {coalition.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-10 gap-y-5 text-sm">
                        {/* Team */}
                        <div>
                          <span className="mb-2 block text-xs text-gray-400">
                            Ekip
                          </span>

                          <div className="flex items-center">
                            {coalition.members.length ===
                              0 && (
                              <span className="text-gray-500">
                                Henüz üye yok
                              </span>
                            )}

                            {coalition.members
                              .slice(0, 5)
                              .map(
                                (
                                  member,
                                  index
                                ) => {
                                  const avatar =
                                    getAvatar(
                                      member
                                    );

                                  return (
                                    <div
                                      key={
                                        member.id
                                      }
                                      className={
                                        "group relative " +
                                        (index >
                                        0
                                          ? "-ml-2"
                                          : "")
                                      }
                                    >
                                      {avatar ? (
                                        <img
                                          src={
                                            avatar
                                          }
                                          alt={getMemberName(
                                            member
                                          )}
                                          className="h-9 w-9 rounded-full border-2 border-white object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600">
                                          {getMemberName(
                                            member
                                          )
                                            .charAt(
                                              0
                                            )
                                            .toUpperCase()}
                                        </div>
                                      )}

                                      <div className="absolute bottom-12 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-black px-2 py-1 text-xs text-white group-hover:block">
                                        {getMemberName(
                                          member
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}

                            {coalition.members.length >
                              5 && (
                              <span className="ml-2 text-xs text-gray-500">
                                +
                                {coalition.members.length -
                                  5}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Member count */}
                        <div>
                          <span className="mb-1 block text-xs text-gray-400">
                            Üye Sayısı
                          </span>

                          <span className="font-medium text-gray-900">
                            {coalition.members.length} kişi
                          </span>
                        </div>

                        {/* Created date */}
                        <div>
                          <span className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                            <CalendarDays
                              size={14}
                            />
                            Başlangıç
                          </span>

                          <span className="font-medium text-gray-900">
                            {formatDate(
                              coalition.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/freelancers/coalitions/${coalition.id}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                      Detayları Gör
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        )}
    </main>
  );
}