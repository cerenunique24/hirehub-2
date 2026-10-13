"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { DirectoryFreelancerCard } from "@/components/freelancers/DirectoryFreelancerCard";
import { useFeatured } from "@/lib/hooks/useFeatured";
import { splitFeatured } from "@/lib/visibility/featured";
import { directoryReturnHref } from "@/components/freelancers/directoryPresentation";
import { panelRootClass } from "@/components/dashboard/PanelPrimitives";
import { buttonClasses } from "@/components/ui/Button";
import styles from "@/components/freelancers/FreelancerDirectory.module.css";
import { useSearchParams } from "next/navigation";
import {
  Search,
  UserPlus,
  SlidersHorizontal,
  Loader2,
  User,
  X,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";

import { publicDisplayName, displayInitial } from "@/lib/utils/displayName";

type Profile = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  role: string | null;
  title: string | null;
  bio: string | null;
  hourly_rate: number | null;
  skills: string[] | null;
  city: string | null;
  availability: string | null;
  availability_status: string | null;
  experience: string | null;
  expertise: string | null;
  project_types: string[] | null;
  work_types: string[] | null;
  languages: string[] | null;
  profile_completion: number | null;
};

type CoalitionMember = {
  user_id: string;
  status: string;
};

function FreelancersContent() {
  const supabase = useMemo(()=>createClient(),[]);
  const searchParams = useSearchParams();

  const featuredIds=useFeatured("profile");
  const coalitionId = searchParams.get("coalitionId");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState(searchParams.get("q")??"");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category")??"Tümü");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );
  const [coalitionMembers, setCoalitionMembers] = useState<
    CoalitionMember[]
  >([]);

  const [membersLoaded,setMembersLoaded]=useState(false);
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
      setCoalitionMembers([]);
      setMembersLoaded(false);

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
            avatar_url,
            role,
            title,
            bio,
            hourly_rate,
            skills,
            city,
            availability,
            availability_status,
            experience,
            expertise,
            project_types,
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
          setMembersLoaded(true);
        }
      }

      setLoading(false);
    };

    loadFreelancers();
  }, [coalitionId, supabase]);

  const categoryOptions = useMemo(
    () => ["Tümü", ...CATEGORIES],
    []
  );

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return profiles.filter((profile) => {
      const fullName = publicDisplayName(profile, "");

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

      const matchesCategory =
        categoryFilter === "Tümü" ||
        (profile.project_types ?? []).includes(categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [profiles, search, categoryFilter]);

  useEffect(()=>{
    if(loading) return;
    const frame=requestAnimationFrame(()=>{try{const key="directory-scroll:"+directoryReturnHref(coalitionId,search,categoryFilter);const saved=sessionStorage.getItem(key);if(saved!==null){sessionStorage.removeItem(key);window.scrollTo({top:Number(saved)||0});}}catch{}});
    return ()=>cancelAnimationFrame(frame);
  },[loading,coalitionId,search,categoryFilter]);

  const featuredGroups=splitFeatured(filteredProfiles,featuredIds);
  const orderedProfiles=[...featuredGroups.featured,...featuredGroups.normal];
  const getFullName = (profile: Profile) => publicDisplayName(profile, "İsimsiz Freelancer");

  const getInitials = (profile: Profile) => displayInitial(profile);

  const getMemberStatus = (profileId: string) => {
    return coalitionMembers.find(
      (member) => member.user_id === profileId
    )?.status;
  };

  const canSuggest = (profile: Profile) => {
    if (!coalitionId || !currentUserId || !membersLoaded) {
      return false;
    }

    if (profile.id === currentUserId) {
      return false;
    }

    const status = getMemberStatus(profile.id);

    return !status;
  };

  useEffect(()=>{
    if(!selectedProfile) return;
    const previous=document.activeElement as HTMLElement|null;
    const dialog=document.getElementById("suggest-dialog");
    const controls=()=>Array.from(dialog?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),a[href]")??[]);
    controls()[0]?.focus();
    const handleKey=(event:KeyboardEvent)=>{if(event.key==="Escape" && !suggesting)setSelectedProfile(null);if(event.key==="Tab"){const items=controls(),first=items[0],last=items[items.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}}};
    document.addEventListener("keydown",handleKey);
    return ()=>{document.removeEventListener("keydown",handleKey);previous?.focus();};
  },[selectedProfile,suggesting]);

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
    <main className={[panelRootClass,styles.page].join(" ")}>
      <div>
        <div className={styles.header}>
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
                aria-label="Freelancer veya beceri ara"
                placeholder="Freelancer, uzmanlık veya yetenek ara..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </div>

            <div className="relative md:w-64">
              <SlidersHorizontal
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select aria-label="Proje kategorisi"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "Tümü"
                      ? "Tüm kategoriler"
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
              Henüz uygun freelancer bulunamadı
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Arama veya filtre kriterlerini değiştirmeyi dene.
            </p>
            {(search || categoryFilter!=="Tümü") && <button type="button" className={buttonClasses({variant:"secondary",size:"sm",className:"mt-4"})} onClick={()=>{setSearch("");setCategoryFilter("Tümü");}}>Filtreleri temizle</button>}
          </div>
        )}

        {!loading && !error && filteredProfiles.length > 0 && (
          <div className={styles.grid}>
            {orderedProfiles.map((profile,index) => {
              const memberStatus = getMemberStatus(profile.id);
              const suggestionAllowed = canSuggest(profile);

              return (
                <Fragment key={profile.id}>
                {index===0&&featuredGroups.featured.length>0&&<h2 className={styles.featuredHeading}>Öne Çıkan Freelancerlar</h2>}
                {index===featuredGroups.featured.length&&featuredGroups.featured.length>0&&<h2 className={styles.featuredHeading}>Freelancerlar</h2>}
                <DirectoryFreelancerCard
                  featured={featuredIds.has(profile.id)}
                  key={profile.id}
                  profile={profile}
                  returnTo={directoryReturnHref(coalitionId,search,categoryFilter)}
                  action={
                    coalitionId ? (
                      <button
                        type="button"
                        disabled={!suggestionAllowed}
                        onClick={() => setSelectedProfile(profile)}
                        className={buttonClasses({variant:"ghost",size:"sm"})}
                      >
                        {memberStatus === "pending" ? (
                          <>
                            <Check size={14} />
                            Önerildi
                          </>
                        ) : memberStatus === "active" ? (
                          "Ekipte"
                        ) : profile.id === currentUserId ? (
                          "Sen"
                        ) : (
                          <>
                            <UserPlus size={14} />
                            Ekip Üyesi Öner
                          </>
                        )}
                      </button>
                    ) : undefined
                  }
                /></Fragment>
              );
            })}
          </div>
        )}
      </div>

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div id="suggest-dialog" role="dialog" aria-modal="true" aria-labelledby="suggest-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="suggest-title" className="text-lg font-semibold text-gray-900">
                  Ekip üyesi öner
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Bu freelancerı koalisyona önermek istediğine
                  emin misin?
                </p>
              </div>

              <button
                aria-label="Öneri penceresini kapat"
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
                className="flex-1 rounded-xl bg-[var(--color-primary-600)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
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
        <main className={[panelRootClass,styles.page].join(" ")}>
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
