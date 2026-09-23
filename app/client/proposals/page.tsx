"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Send,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  MessageCircle,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { calculateClientPricing, formatRatePercent, getProjectCommissionRate } from "@/lib/pricing";
import {
  checkAndUpdateProjectReadiness,
  describeAcceptPlacementError,
  getRoleCapacity as getRoleCapacityForRoles,
  normalizeRoleName,
} from "@/lib/projects/teamReadiness";
import { notifyUsers } from "@/lib/notifications";

type TopTab = "received" | "sent";
type FilterType = "all" | "pending" | "accepted" | "rejected";

type SentInvitation = {
  id: string;
  project_id: string;
  freelancer_id: string;
  role: string;
  budget_per_person: number | null;
  duration: string | null;
  message: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  project: { id: string; title: string } | null;
  freelancer: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    title: string | null;
  } | null;
};

function filterStatusKey(status: string | null): FilterType {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected" || normalized === "cancelled") {
    return "rejected";
  }

  return "pending";
}

function invitationStatusLabel(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "cancelled") return "İptal Edildi";
  if (normalized === "accepted") return "Kabul Edildi";
  if (normalized === "rejected") return "Reddedildi";

  return "Bekleyen";
}

function invitationStatusClass(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "cancelled") return "bg-gray-100 text-gray-600";
  if (normalized === "accepted") return "bg-green-50 text-green-700";
  if (normalized === "rejected") return "bg-red-50 text-red-700";

  return "bg-amber-50 text-amber-700";
}

type Freelancer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  skills: string[] | null;
  availability_status: string | null;
};

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "🟢 Müsait",
  limited: "🟡 Kısmen Müsait",
  unavailable: "🔴 Müsait Değil",
};

type BudgetBreakdownRole = {
  roleId?: string;
  role?: string;
  name?: string;
  memberCount?: number;
};

type Project = {
  id: string;
  title: string;
  client_id: string;
  status: string | null;
  budget_breakdown: BudgetBreakdownRole[] | null;
  commission_rate: number | null;
};

type RawProposal = {
  id: string;
  project_id: string;
  freelancer_id: string;
  role: string | null;
  bid_amount: number | null;
  delivery_days: number | null;
  cover_letter: string | null;
  status: string | null;
  created_at: string;
  viewed_at: string | null;
};

type Proposal = RawProposal & {
  project: Project | null;
  freelancer: Freelancer | null;
};

function getRoleCapacity(
  project: Project | null,
  roleName: string
): number {
  return getRoleCapacityForRoles(project?.budget_breakdown, roleName);
}

function statusLabel(status: string | null) {
  const labels: Record<string, string> = {
    pending: "İnceleniyor",
    accepted: "Kabul edildi",
    rejected: "Reddedildi",
  };

  return labels[status ?? ""] ?? "Bilinmiyor";
}

function statusClass(status: string | null) {
  if (status === "accepted") {
    return "bg-green-50 text-green-700";
  }

  if (status === "rejected") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

function projectStatusLabel(status: string | null) {
  const labels: Record<string, string> = {
    open: "Başvurular açık",
    ready_to_start: "Ekip hazır",
    in_progress: "Aktif proje",
    completed: "Tamamlandı",
    cancelled: "İptal edildi",
  };

  return labels[status ?? ""] ?? status ?? "Bilinmiyor";
}

export default function ClientProposalsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<TopTab>("received");
  const [receivedFilter, setReceivedFilter] =
    useState<FilterType>("all");
  const [sentFilter, setSentFilter] = useState<FilterType>("all");

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);


  const [sentInvitations, setSentInvitations] = useState<
    SentInvitation[]
  >([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    void loadSentInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSentInvitations() {
    setInvitationsLoading(true);
    setInvitationsError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSentInvitations([]);
      setInvitationsError("Oturum bilgisi bulunamadı.");
      setInvitationsLoading(false);
      return;
    }

    const { data, error: invitationsFetchError } = await supabase
      .from("project_team_invitations")
      .select(
        `
          id,
          project_id,
          freelancer_id,
          role,
          budget_per_person,
          duration,
          message,
          status,
          created_at,
          responded_at,
          project:projects (
            id,
            title
          ),
          freelancer:profiles!project_team_invitations_freelancer_id_fkey (
            id,
            first_name,
            last_name,
            title
          )
        `
      )
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    if (invitationsFetchError) {
      console.error("Sent invitations load error:", {
        message: invitationsFetchError.message,
        details: invitationsFetchError.details,
        hint: invitationsFetchError.hint,
        code: invitationsFetchError.code,
      });
      setSentInvitations([]);
      setInvitationsError("Gönderilen teklifler yüklenirken bir hata oluştu.");
      setInvitationsLoading(false);
      return;
    }

    const normalized: SentInvitation[] = (data ?? []).map((item: any) => ({
      id: item.id,
      project_id: item.project_id,
      freelancer_id: item.freelancer_id,
      role: item.role,
      budget_per_person:
        item.budget_per_person === null
          ? null
          : Number(item.budget_per_person),
      duration: item.duration,
      message: item.message,
      status: item.status,
      created_at: item.created_at,
      responded_at: item.responded_at,
      project: Array.isArray(item.project)
        ? item.project[0] ?? null
        : item.project ?? null,
      freelancer: Array.isArray(item.freelancer)
        ? item.freelancer[0] ?? null
        : item.freelancer ?? null,
    }));

    setSentInvitations(normalized);
    setInvitationsLoading(false);
  }

  async function cancelInvitation(invitationId: string) {
    setCancellingId(invitationId);

    try {
      const { error: cancelError } = await supabase
        .from("project_team_invitations")
        .update({ status: "cancelled", responded_at: new Date().toISOString() })
        .eq("id", invitationId)
        .eq("status", "pending");

      if (cancelError) {
        console.error("Cancel invitation error:", cancelError);
        setInvitationsError("Teklif iptal edilemedi.");
        return;
      }

      setSentInvitations((current) =>
        current.map((item) =>
          item.id === invitationId
            ? {
                ...item,
                status: "cancelled",
                responded_at: new Date().toISOString(),
              }
            : item
        )
      );
    } finally {
      setCancellingId(null);
    }
  }

  const receivedCounts = useMemo(() => {
    return {
      all: proposals.length,
      pending: proposals.filter(
        (item) => filterStatusKey(item.status) === "pending"
      ).length,
      accepted: proposals.filter(
        (item) => filterStatusKey(item.status) === "accepted"
      ).length,
      rejected: proposals.filter(
        (item) => filterStatusKey(item.status) === "rejected"
      ).length,
    };
  }, [proposals]);

  const sentCounts = useMemo(() => {
    return {
      all: sentInvitations.length,
      pending: sentInvitations.filter(
        (item) => filterStatusKey(item.status) === "pending"
      ).length,
      accepted: sentInvitations.filter(
        (item) => filterStatusKey(item.status) === "accepted"
      ).length,
      rejected: sentInvitations.filter(
        (item) => filterStatusKey(item.status) === "rejected"
      ).length,
    };
  }, [sentInvitations]);

  const filteredProposals = useMemo(() => {
    if (receivedFilter === "all") return proposals;
    return proposals.filter(
      (item) => filterStatusKey(item.status) === receivedFilter
    );
  }, [proposals, receivedFilter]);

  const filteredSentInvitations = useMemo(() => {
    if (sentFilter === "all") return sentInvitations;
    return sentInvitations.filter(
      (item) => filterStatusKey(item.status) === sentFilter
    );
  }, [sentInvitations, sentFilter]);

  const counts = activeTab === "received" ? receivedCounts : sentCounts;
  const filterValue = activeTab === "received" ? receivedFilter : sentFilter;
  const setFilterValue =
    activeTab === "received" ? setReceivedFilter : setSentFilter;

  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      setError("");

      try {
        // Giriş yapan kullanıcıyı al
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("KULLANICI HATASI:", userError);
          setError(
            `Oturum bilgisi alınamadı: ${userError.message}`
          );
          return;
        }

        if (!user) {
          setError(
            "Teklifleri görüntülemek için giriş yapmanız gerekiyor."
          );
          return;
        }

        // Client'ın projelerini getir
        const {
          data: projects,
          error: projectsError,
        } = await supabase
          .from("projects")
          .select("id, title, client_id, status, budget_breakdown, commission_rate")
          .eq("client_id", user.id);

        if (projectsError) {
          console.error("PROJE HATASI:", projectsError);
          setError(
            `Projeleriniz yüklenemedi: ${projectsError.message}`
          );
          return;
        }

        const projectIds = (projects ?? []).map(
          (project) => project.id
        );

        // Client'ın hiç projesi yoksa
        if (projectIds.length === 0) {
          setProposals([]);
          return;
        }

        // Projelere ait teklifleri getir
        // (rol bilgisi proposals.role text kolonunda tutuluyor,
        // project_roles tablosuna ihtiyaç yok)
        const {
          data: rawProposals,
          error: proposalsError,
        } = await supabase
          .from("proposals")
          .select(
            `
              id,
              project_id,
              freelancer_id,
              role,
              bid_amount,
              delivery_days,
              cover_letter,
              status,
              created_at,
              viewed_at
            `
          )
          .in("project_id", projectIds)
          .order("created_at", {
            ascending: false,
          });

        if (proposalsError) {
          console.error(
            "TEKLİF SORGUSU HATASI:",
            proposalsError
          );

          setError(
            `Teklifler yüklenemedi: ${proposalsError.message}`
          );
          return;
        }

        const proposalsData =
          (rawProposals ?? []) as RawProposal[];

        if (proposalsData.length === 0) {
          setProposals([]);
          return;
        }

        // Freelancer ID'lerini çıkar
        const freelancerIds = [
          ...new Set(
            proposalsData.map(
              (proposal) => proposal.freelancer_id
            )
          ),
        ];

        // Freelancer profillerini getir
        const {
          data: profiles,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              first_name,
              last_name,
              title,
              skills,
              availability_status
            `
          )
          .in("id", freelancerIds);

        if (profilesError) {
          console.error(
            "FREELANCER PROFİL HATASI:",
            profilesError
          );
        }

        // Projeleri Map'e çevir
        const projectById = new Map(
          (projects ?? []).map((project) => [
            project.id,
            project as unknown as Project,
          ])
        );

        // Profilleri Map'e çevir
        const profileById = new Map(
          (profiles ?? []).map((profile) => [
            profile.id,
            profile,
          ])
        );

        // Teklif + proje + freelancer bilgilerini birleştir
        const formattedProposals: Proposal[] =
          proposalsData.map((proposal) => ({
            ...proposal,
            project:
              projectById.get(proposal.project_id) ?? null,
            freelancer:
              profileById.get(
                proposal.freelancer_id
              ) ?? null,
          }));

        setProposals(formattedProposals);

        /*
         * Freelancer'ın Premium teklif performans analizindeki
         * "görüntülenen teklif" sayısı bu alana dayanır — client
         * teklifi listesinde gördüğünde bir kere işaretlenir.
         */
        const unviewedIds = proposalsData
          .filter((proposal) => !proposal.viewed_at)
          .map((proposal) => proposal.id);

        if (unviewedIds.length > 0) {
          void supabase
            .from("proposals")
            .update({ viewed_at: new Date().toISOString() })
            .in("id", unviewedIds)
            .then(({ error: viewError }) => {
              if (viewError) {
                console.error("TEKLİF GÖRÜNTÜLENME İŞARETİ HATASI:", viewError);
              }
            });
        }
      } catch (unexpectedError) {
        console.error(
          "BEKLENMEYEN TEKLİF HATASI:",
          unexpectedError
        );

        setError(
          "Teklifler yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProposals();
  }, [supabase]);

  async function updateProposalStatus(
    proposalId: string,
    status: "accepted" | "rejected"
  ) {
    setUpdatingId(proposalId);
    setError("");

    try {
      const proposal = proposals.find(
        (item) => item.id === proposalId
      );

      if (!proposal) {
        setError("Teklif bulunamadı.");
        return;
      }

      // Reddetme işlemi
      if (status === "rejected") {
        const { error: proposalError } = await supabase
          .from("proposals")
          .update({
            status: "rejected",
          })
          .eq("id", proposalId)
          .eq("status", "pending");

        if (proposalError) {
          console.error(
            "TEKLİF REDDETME HATASI:",
            proposalError
          );

          setError(
            `Teklif reddedilemedi: ${proposalError.message}`
          );
          return;
        }

        await notifyUsers(supabase, [
          {
            userId: proposal.freelancer_id,
            type: "proposal_rejected",
            title: "Teklifin reddedildi",
            message: `"${proposal.project?.title ?? "Proje"}" için gönderdiğin teklif reddedildi.`,
            link: "/freelancers/proposals",
          },
        ]);

        setProposals((current) =>
          current.map((item) =>
            item.id === proposalId
              ? {
                  ...item,
                  status: "rejected",
                }
              : item
          )
        );

        return;
      }

      // =====================================================
      // KABUL ETME AKIŞI
      // =====================================================

      // Rol metni yoksa (beklenmeyen veri durumu) kabul edilemez.
      if (!proposal.role) {
        setError(
          "Bu teklif herhangi bir role bağlı değil."
        );
        return;
      }

      if (!proposal.project) {
        setError("Teklifin bağlı olduğu proje bulunamadı.");
        return;
      }

      if (
        proposal.project.status !== "open" &&
        proposal.project.status !== "ready_to_start"
      ) {
        setError(
          "Bu proje artık yeni ekip üyesi kabul etmeye uygun değil."
        );
        return;
      }

      // Hızlı, kullanıcı dostu ön kontrol (UX amaçlı) — gerçek
      // yetkilendirme sınırı bu değil, aşağıdaki accept_project_placement
      // DB fonksiyonu. Bu fonksiyon hem burada hem de freelancer'ın davet
      // kabul akışında (app/freelancers/proposals/page.tsx) aynı şekilde
      // kullanılıyor ve kapasite/tekrar-üyelik kontrolünü proje satırını
      // kilitleyerek atomik ve race-condition'a dayanıklı şekilde yapıyor.
      const roleCapacity = getRoleCapacity(
        proposal.project,
        proposal.role
      );

      const {
        data: existingMembers,
        error: membersError,
      } = await supabase
        .from("project_team_members")
        .select("id, freelancer_id, role, status")
        .eq("project_id", proposal.project_id)
        .eq("status", "active");

      if (membersError) {
        console.error(
          "EKİP ÜYESİ SORGUSU HATASI:",
          membersError
        );

        setError(
          `Mevcut ekip kontrol edilemedi: ${membersError.message}`
        );
        return;
      }

      const isTeamProject =
        Array.isArray(proposal.project.budget_breakdown) &&
        proposal.project.budget_breakdown.length > 0;

      const sameRoleMembers = (existingMembers ?? []).filter(
        (member) =>
          normalizeRoleName(member.role ?? "") ===
          normalizeRoleName(proposal.role ?? "")
      );

      const relevantMemberCount = isTeamProject
        ? sameRoleMembers.length
        : (existingMembers ?? []).length;

      if (relevantMemberCount >= roleCapacity) {
        setError(
          isTeamProject
            ? `"${proposal.role}" rolü zaten dolu. Bu role başka bir freelancer kabul edilemez.`
            : "Bu proje zaten bir ekip üyesi kabul etmiş."
        );
        return;
      }

      const alreadyMember = (existingMembers ?? []).some(
        (member) => member.freelancer_id === proposal.freelancer_id
      );

      if (alreadyMember) {
        setError(
          "Bu freelancer zaten bu projenin aktif ekip üyesi."
        );
        return;
      }

      // Asıl kabul + kapasite/tekrar-üyelik doğrulaması + ekibe ekleme,
      // tek bir atomik DB transaction'ında (accept_project_placement RPC).
      const { error: acceptError } = await supabase.rpc(
        "accept_project_placement",
        { p_source: "proposal", p_source_id: proposal.id }
      );

      if (acceptError) {
        console.error("TEKLİF KABUL HATASI:", acceptError);
        setError(describeAcceptPlacementError(acceptError.message));
        return;
      }

      // Aynı role ait diğer pending teklifleri reddet.
      const { error: rejectOthersError } =
        await supabase
          .from("proposals")
          .update({
            status: "rejected",
          })
          .eq("project_id", proposal.project_id)
          .eq("role", proposal.role)
          .eq("status", "pending")
          .neq("id", proposal.id);

      if (rejectOthersError) {
        console.error(
          "AYNI ROLE AİT DİĞER TEKLİFLER REDDEDİLEMEDİ:",
          rejectOthersError
        );
      }

      // =====================================================
      // TÜM ROLLER DOLDU MU?
      // =====================================================
      // Henüz aktif başlatmıyoruz; sadece ready_to_start'a geçiriyoruz.

      const { error: readinessError } = await checkAndUpdateProjectReadiness(
        supabase,
        proposal.project_id
      );

      if (readinessError) {
        console.error(
          "PROJE DURUMU GÜNCELLEME HATASI:",
          readinessError
        );

        setError(
          `Ekip oluşturuldu ancak proje durumu güncellenemedi: ${readinessError}`
        );
      }

      await notifyUsers(supabase, [
        {
          userId: proposal.freelancer_id,
          type: "proposal_accepted",
          title: "Teklifin kabul edildi",
          message: `"${proposal.project?.title ?? "Proje"}" projesindeki teklifin kabul edildi.`,
          link: "/freelancers/projects",
        },
      ]);

      // UI güncelle
      setProposals((current) =>
        current.map((item) => {
          if (item.id === proposal.id) {
            return {
              ...item,
              status: "accepted",
            };
          }

          if (
            item.project_id === proposal.project_id &&
            normalizeRoleName(item.role ?? "") ===
              normalizeRoleName(proposal.role ?? "") &&
            item.status === "pending"
          ) {
            return {
              ...item,
              status: "rejected",
            };
          }

          return item;
        })
      );
    } catch (unexpectedError) {
      console.error(
        "BEKLENMEYEN GÜNCELLEME HATASI:",
        unexpectedError
      );

      setError(
        "Teklif güncellenirken beklenmeyen bir hata oluştu."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900">
            Teklifler
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Freelancerlardan gelen teklifleri ve ekiplere gönderdiğiniz
            davetleri buradan yönetin.
          </p>
        </div>

        {/* Üst tablar: Gelen / Gönderilen */}
        <div className="mt-6 flex gap-2 border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === "received"
                ? "border-[var(--color-primary-600)] text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <ArrowDownToLine className="h-4 w-4" />
            Gelen Teklifler
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {receivedCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === "sent"
                ? "border-[var(--color-primary-600)] text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            Gönderilen Teklifler
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {sentCounts.all}
            </span>
          </button>
        </div>

        {/* Alt tablar: Tümü / Bekleyen / Kabul Edilen / Reddedilen */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setFilterValue("all")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              filterValue === "all"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Tümü ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setFilterValue("pending")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              filterValue === "pending"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Bekleyen ({counts.pending})
          </button>

          <button
            type="button"
            onClick={() => setFilterValue("accepted")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              filterValue === "accepted"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Kabul Edilen ({counts.accepted})
          </button>

          <button
            type="button"
            onClick={() => setFilterValue("rejected")}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              filterValue === "rejected"
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Reddedilen ({counts.rejected})
          </button>
        </div>

        {activeTab === "received" && loading && (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white p-10 text-sm text-neutral-500">
            <Loader2 size={18} className="animate-spin" />
            Teklifler yükleniyor...
          </div>
        )}

        {activeTab === "received" && !loading && error && (
          <div className="mt-6 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />
            <div>{error}</div>
          </div>
        )}

        {activeTab === "received" &&
          !loading &&
          !error &&
          filteredProposals.length === 0 && (
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-10 text-center">
            <Send className="mx-auto text-neutral-400" />

            <h2 className="mt-4 text-lg font-semibold text-neutral-900">
              {receivedFilter === "all"
                ? "Henüz teklif gelmedi"
                : "Bu kategoride teklif bulunmuyor"}
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Projeleriniz yayınlandığında freelancerların
              teklifleri burada görünür.
            </p>
          </div>
        )}

        {activeTab === "received" && !loading && !error && (
        <div className="mt-8 space-y-4">
          {filteredProposals.map((proposal) => {
            const freelancerName = proposal.freelancer
              ? [
                  proposal.freelancer.first_name,
                  proposal.freelancer.last_name,
                ]
                  .filter(Boolean)
                  .join(" ") || "Freelancer"
              : "Freelancer";

            return (
              <article
                key={proposal.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">
                      {proposal.project?.title ?? "Proje"}
                    </p>

                    {proposal.freelancer ? (
                      <Link
                        href={`/client/freelancers/${proposal.freelancer.id}`}
                        className="mt-1 block text-lg font-semibold text-neutral-900 hover:underline"
                      >
                        {freelancerName}
                      </Link>
                    ) : (
                      <h2 className="mt-1 text-lg font-semibold text-neutral-900">
                        Freelancer bilgisi bulunamadı
                      </h2>
                    )}

                    {proposal.freelancer?.title && (
                      <p className="mt-1 text-sm text-neutral-500">
                        {proposal.freelancer.title}
                      </p>
                    )}

                    {proposal.freelancer && (
                      <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                        {AVAILABILITY_LABEL[
                          proposal.freelancer.availability_status ??
                            "available"
                        ] ?? AVAILABILITY_LABEL.available}
                      </span>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(
                      proposal.status
                    )}`}
                  >
                    {statusLabel(proposal.status)}
                  </span>
                </div>

                {/* Role */}
                <div className="mt-4 flex items-center gap-2">
                  <Users
                    size={15}
                    className="text-neutral-400"
                  />

                  {proposal.role ? (
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                      {proposal.role}
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                      Rol belirtilmemiş
                    </span>
                  )}

                  {proposal.project?.status && (
                    <span className="text-xs text-neutral-400">
                      ·{" "}
                      {projectStatusLabel(
                        proposal.project.status
                      )}
                    </span>
                  )}
                </div>

                {proposal.freelancer?.skills?.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Yetenekler
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {proposal.freelancer.skills.map(
                        (skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 border-t border-neutral-100 pt-5">
                  <p className="text-sm leading-6 text-neutral-600">
                    {proposal.cover_letter ||
                      "Teklif mesajı eklenmemiş."}
                  </p>

                  <p className="mt-4 text-sm font-medium text-neutral-700">
                    {formatCurrency(
                      Number(proposal.bid_amount ?? 0)
                    )}
                    {" · "}
                    {proposal.delivery_days
                      ? `${proposal.delivery_days} gün`
                      : "Teslim süresi belirtilmedi"}
                  </p>

                  {proposal.project && Number(proposal.bid_amount ?? 0) > 0 && (() => {
                    // Rate frozen on the project at creation — not the client's current plan.
                    const pricing = calculateClientPricing(
                      Number(proposal.bid_amount),
                      getProjectCommissionRate(proposal.project)
                    );
                    return (
                      <dl className="mt-3 grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-[13px] text-neutral-500">
                        <dt>Freelancer bedeli</dt>
                        <dd className="text-right tabular-nums text-neutral-700">{formatCurrency(pricing.freelancerAmount)}</dd>
                        <dt>Platform hizmet bedeli ({formatRatePercent(pricing.rate)})</dt>
                        <dd className="text-right tabular-nums text-neutral-700">{formatCurrency(pricing.platformFee)}</dd>
                        <dt className="font-medium text-neutral-800">Toplam maliyet</dt>
                        <dd className="text-right font-medium tabular-nums text-neutral-900">{formatCurrency(pricing.clientTotal)}</dd>
                      </dl>
                    );
                  })()}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {proposal.project && (
                    <Link
                      href={`/client/projects/${proposal.project.id}`}
                      className="text-sm font-medium text-neutral-700 transition hover:text-[var(--color-text-primary)]"
                    >
                      Projeyi görüntüle
                    </Link>
                  )}

                  {proposal.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={
                          updatingId === proposal.id
                        }
                        onClick={() =>
                          void updateProposalStatus(
                            proposal.id,
                            "accepted"
                          )
                        }
                        className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-xs font-medium text-white transition hover:bg-[var(--color-primary-700)] disabled:opacity-50"
                      >
                        {updatingId === proposal.id
                          ? "İşleniyor..."
                          : "Kabul et"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          updatingId === proposal.id
                        }
                        onClick={() =>
                          void updateProposalStatus(
                            proposal.id,
                            "rejected"
                          )
                        }
                        className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                      >
                        Reddet
                      </button>
                    </>
                  )}

                  {proposal.status === "accepted" && (
                    <Link
                      href={`/client/messages?user=${proposal.freelancer_id}&proposal=${proposal.id}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-xs font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                    >
                      <MessageCircle size={15} />
                      Freelancer&apos;a mesaj gönder
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        )}

        {/* GÖNDERİLEN TEKLİFLER (ekip davetleri) */}
        {activeTab === "sent" && invitationsLoading && (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white p-10 text-sm text-neutral-500">
            <Loader2 size={18} className="animate-spin" />
            Davetler yükleniyor...
          </div>
        )}

        {activeTab === "sent" && !invitationsLoading && invitationsError && (
          <div className="mt-6 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>{invitationsError}</div>
          </div>
        )}

        {activeTab === "sent" &&
          !invitationsLoading &&
          !invitationsError &&
          filteredSentInvitations.length === 0 && (
            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-10 text-center">
              <ArrowUpFromLine className="mx-auto text-neutral-400" />

              <h2 className="mt-4 text-lg font-semibold text-neutral-900">
                {sentFilter === "all"
                  ? "Henüz bir freelancer'a davet göndermediniz"
                  : "Bu kategoride davet bulunmuyor"}
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Eşleşme sonuçlarından bir freelancer'ı ekibinize davet
                ettiğinizde burada görünür.
              </p>
            </div>
          )}

        {activeTab === "sent" && !invitationsLoading && !invitationsError && (
          <div className="mt-8 space-y-4">
            {filteredSentInvitations.map((invitation) => {
              const freelancerName = invitation.freelancer
                ? [
                    invitation.freelancer.first_name,
                    invitation.freelancer.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Freelancer"
                : "Freelancer";

              return (
                <article
                  key={invitation.id}
                  className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">
                        {invitation.project?.title ?? "Proje"}
                      </p>

                      {invitation.freelancer ? (
                        <Link
                          href={`/client/freelancers/${invitation.freelancer.id}`}
                          className="mt-1 block text-lg font-semibold text-neutral-900 hover:underline"
                        >
                          {freelancerName}
                        </Link>
                      ) : (
                        <h2 className="mt-1 text-lg font-semibold text-neutral-900">
                          Freelancer bilgisi bulunamadı
                        </h2>
                      )}

                      {invitation.freelancer?.title && (
                        <p className="mt-1 text-sm text-neutral-500">
                          {invitation.freelancer.title}
                        </p>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${invitationStatusClass(
                        invitation.status
                      )}`}
                    >
                      {invitationStatusLabel(invitation.status)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Users size={15} className="text-neutral-400" />

                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                      {invitation.role}
                    </span>
                  </div>

                  <div className="mt-5 border-t border-neutral-100 pt-5">
                    <p className="text-sm leading-6 text-neutral-600">
                      {invitation.message || "Davet mesajı eklenmemiş."}
                    </p>

                    <p className="mt-4 text-sm font-medium text-neutral-700">
                      {invitation.budget_per_person !== null
                        ? formatCurrency(invitation.budget_per_person)
                        : "Bütçe belirtilmedi"}
                      {" · "}
                      {invitation.duration || "Süre belirtilmedi"}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {invitation.project && (
                      <Link
                        href={`/client/projects/${invitation.project.id}`}
                        className="text-sm font-medium text-neutral-700 transition hover:text-[var(--color-text-primary)]"
                      >
                        Projeyi görüntüle
                      </Link>
                    )}

                    {filterStatusKey(invitation.status) === "pending" && (
                      <button
                        type="button"
                        disabled={cancellingId === invitation.id}
                        onClick={() =>
                          void cancelInvitation(invitation.id)
                        }
                        className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {cancellingId === invitation.id
                          ? "İşleniyor..."
                          : "Daveti İptal Et"}
                      </button>
                    )}

                    {invitation.status === "accepted" && (
                      <Link
                        href={`/client/messages?user=${invitation.freelancer_id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-xs font-medium text-white transition hover:bg-[var(--color-primary-700)]"
                      >
                        <MessageCircle size={15} />
                        Freelancer&apos;a mesaj gönder
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
