"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  MapPin,
  Briefcase,
  UserPlus,
  SlidersHorizontal,
  Loader2,
  User,
  X,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string | null;
  title: string | null;
  bio: string | null;
  hourly_rate: number | null;
  skills: string[] | null;
  city: string | null;
  availability: string | null;
  experience: string | null;
  expertise: string | null;
  work_types: string[] | null;
  languages: string[] | null;
  profile_completion: number | null;
};

type CoalitionMember = {
  user_id: string;
  status: string;
};

function FreelancersContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const coalitionId = searchParams.get("coalitionId");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState("Tümü");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );
  const [coalitionMembers, setCoalitionMembers] = useState<
    CoalitionMember[]
  >([]);

  const [selectedProfile, setSelectedProfile] =
    useState<Profile | null>(null);

  const [suggesting, setSuggesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadFreelancers = async () => {
      setLoading(true);
      setError(null);

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Oturum açmanız gerekiyor.");
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            first_name,
            last_name,
            avatar_url,
            role,
            title,
            bio,
            hourly_rate,
            skills,
            city,
            availability,
            experience,
            expertise,
            work_types,
            languages,
            profile_completion
          `
        )
        .eq("role", "freelancer")
        .order("profile_completion", {
          ascending: false,
          nullsFirst: false,
        });

      if (error) {
        console.error("Freelancerlar yüklenirken hata:", error);
        setError("Freelancerlar yüklenirken bir hata oluştu.");
        setProfiles([]);
        setLoading(false);
        return;
      }

      setProfiles(data ?? []);

      if (coalitionId) {
        const { data: memberData, error: memberError } =
          await supabase
            .from("coalition_members")
            .select("user_id, status")
            .eq("coalition_id", coalitionId);

        if (memberError) {
          console.error(
            "Koalisyon üyeleri yüklenirken hata:",
            memberError
          );
        } else {
          setCoalitionMembers(memberData ?? []);
        }
      }

      setLoading(false);
    };

    loadFreelancers();
  }, [coalitionId, supabase]);

  const expertiseOptions = useMemo(() => {
    const values = profiles
      .map((profile) => profile.expertise)
      .filter((value): value is string => Boolean(value?.trim()));

    return ["Tümü", ...Array.from(new Set(values))];
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return profiles.filter((profile) => {
      const fullName =
        `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

      const searchableText = [
        fullName,
        profile.title ?? "",
        profile.bio ?? "",
        profile.expertise ?? "",
        profile.city ?? "",
        ...(profile.skills ?? []),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesExpertise =
        expertiseFilter === "Tümü" ||
        profile.expertise === expertiseFilter;

      return matchesSearch && matchesExpertise;
    });
  }, [profiles, search, expertiseFilter]);

  const getFullName = (profile: Profile) => {
    const name =
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();

    return name || "İsimsiz Freelancer";
  };

  const getInitials = (profile: Profile) => {
    const first = profile.first_name?.charAt(0) ?? "";
    const last = profile.last_name?.charAt(0) ?? "";

    return `${first}${last}`.toUpperCase() || "F";
  };

  const getMemberStatus = (profileId: string) => {
    return coalitionMembers.find(
      (member) => member.user_id === profileId
    )?.status;
  };

  const canSuggest = (profile: Profile) => {
    if (!coalitionId || !currentUserId) {
      return false;
    }

    if (profile.id === currentUserId) {
      return false;
    }

    const status = getMemberStatus(profile.id);

    return !status;
  };

  const getButtonText = (profile: Profile) => {
    if (profile.id === currentUserId) {
      return "Sen";
    }

    const status = getMemberStatus(profile.id);

    if (status === "active") {
      return "Ekipte";
    }

    if (status === "pending") {
      return "Önerildi";
    }

    return "Ekip Üyesi Öner";
  };

  const handleSuggest = async () => {
    if (!selectedProfile || !coalitionId || !currentUserId) {
      return;
    }

    setSuggesting(true);
    setError(null);
    setSuccessMessage(null);

    const existingMember = coalitionMembers.find(
      (member) => member.user_id === selectedProfile.id
    );

    if (existingMember) {
      setError(
        "Bu freelancer için zaten aktif veya bekleyen bir kayıt bulunuyor."
      );
      setSuggesting(false);
      setSelectedProfile(null);
      return;
    }

    const suggestedRole =
      selectedProfile.title ||
      selectedProfile.expertise ||
      "Ekip Üyesi";

    const { error: insertError } = await supabase
      .from("coalition_members")
      .insert({
        coalition_id: coalitionId,
        user_id: selectedProfile.id,
        role: suggestedRole,
        status: "pending",
        invited_by: currentUserId,
        joined_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(
        "Ekip üyesi önerilirken hata:",
        insertError
      );

      if (
        insertError.code === "23505" ||
        insertError.message
          ?.toLowerCase()
          .includes("duplicate")
      ) {
        setError(
          "Bu freelancer için zaten bir ekip önerisi bulunuyor."
        );
      } else {
        setError(
          "Ekip üyesi önerilirken bir hata oluştu. Lütfen tekrar deneyin."
        );
      }

      setSuggesting(false);
      return;
    }

    setCoalitionMembers((current) => [
      ...current,
      {
        user_id: selectedProfile.id,
        status: "pending",
      },
    ]);

    setSuccessMessage(
      `${getFullName(selectedProfile)} için ekip üyesi önerisi gönderildi.`
    );

    setSuggesting(false);
    setSelectedProfile(null);

    window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  return (
    <main className="w-full p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Freelancerlar
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Projelerin için uygun uzmanları keşfet.
              </p>
            </div>

            {coalitionId && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  Ekip üyesi önerme modu
                </span>

                <span className="ml-2">
                  Koalisyon için uygun bir freelancer seç.
                </span>
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <Check size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Freelancer, uzmanlık veya yetenek ara..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </div>

            <div className="relative md:w-64">
              <SlidersHorizontal
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select
                value={expertiseFilter}
                onChange={(event) =>
                  setExpertiseFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
              >
                {expertiseOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Tümü"
                      ? "Tüm uzmanlıklar"
                      : option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!loading && !error && (
          <div className="mb-4 text-sm text-gray-500">
            {filteredProfiles.length} freelancer gösteriliyor
          </div>
        )}

        {loading && (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              Freelancerlar yükleniyor...
            </div>
          </div>
        )}

        {!loading && !error && filteredProfiles.length === 0 && (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <User size={20} className="text-gray-500" />
            </div>

            <h2 className="font-medium text-gray-900">
              Freelancer bulunamadı
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Arama veya filtre kriterlerini değiştirmeyi dene.
            </p>
          </div>
        )}

        {!loading && !error && filteredProfiles.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfiles.map((profile) => {
              const fullName = getFullName(profile);
              const memberStatus = getMemberStatus(profile.id);
              const suggestionAllowed = canSuggest(profile);

              return (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={fullName}
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-600">
                        {getInitials(profile)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-gray-900">
                        {fullName}
                      </h2>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {profile.title || "Freelancer"}
                      </p>

                      {profile.expertise && (
                        <p className="mt-2 text-xs font-medium text-gray-700">
                          {profile.expertise}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-gray-500">
                    {profile.city && (
                      <div className="flex items-center gap-2">
                        <MapPin size={15} />
                        <span>{profile.city}</span>
                      </div>
                    )}

                    {profile.experience && (
                      <div className="flex items-center gap-2">
                        <Briefcase size={15} />
                        <span>{profile.experience}</span>
                      </div>
                    )}

                    {profile.hourly_rate !== null && (
                      <div className="text-sm font-medium text-gray-900">
                        ₺{profile.hourly_rate}/saat
                      </div>
                    )}
                  </div>

                  {profile.skills && profile.skills.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {profile.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex gap-2">
                    <Link
                      href={`/freelancers/${profile.id}`}
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Profili Gör
                    </Link>

                    {coalitionId && (
                      <button
                        type="button"
                        disabled={!suggestionAllowed}
                        onClick={() => setSelectedProfile(profile)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {memberStatus === "pending" ? (
                          <>
                            <Check size={16} />
                            Önerildi
                          </>
                        ) : memberStatus === "active" ? (
                          "Ekipte"
                        ) : profile.id === currentUserId ? (
                          "Sen"
                        ) : (
                          <>
                            <UserPlus size={16} />
                            Ekip Üyesi Öner
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Ekip üyesi öner
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Bu freelancerı koalisyona önermek istediğine
                  emin misin?
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!suggesting) {
                    setSelectedProfile(null);
                  }
                }}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                {selectedProfile.avatar_url ? (
                  <img
                    src={selectedProfile.avatar_url}
                    alt={getFullName(selectedProfile)}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-600">
                    {getInitials(selectedProfile)}
                  </div>
                )}

                <div>
                  <p className="font-medium text-gray-900">
                    {getFullName(selectedProfile)}
                  </p>

                  <p className="text-sm text-gray-500">
                    {selectedProfile.title ||
                      selectedProfile.expertise ||
                      "Freelancer"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              Öneri gönderildikten sonra koalisyon sahibi bu
              freelancerı inceleyip onaylayabilir veya reddedebilir.
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={suggesting}
                onClick={() => setSelectedProfile(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={suggesting}
                onClick={() => void handleSuggest()}
                className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suggesting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Gönderiliyor...
                  </span>
                ) : (
                  "Öneriyi Gönder"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function FreelancersPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full p-8">
          <div className="mx-auto flex min-h-[300px] max-w-7xl items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              Freelancerlar yükleniyor...
            </div>
          </div>
        </main>
      }
    >
      <FreelancersContent />
    </Suspense>
  );
}