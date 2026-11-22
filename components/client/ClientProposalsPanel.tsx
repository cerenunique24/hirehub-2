"use client";

import { buttonClasses } from "@/components/ui/Button";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { FilterBar } from "@/components/ui/FilterBar";
import { Tabs } from "@/components/ui/Tabs";
import { pageHeaderClass } from "@/components/ui/PageHeader";
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Send,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { publicDisplayName } from "@/lib/utils/displayName";
import {
  checkAndUpdateProjectReadiness,
  describeAcceptPlacementError,
  fetchBudgetBreakdown,
  getRoleCapacity as getRoleCapacityForRoles,
  normalizeRoleName,
} from "@/lib/projects/teamReadiness";
import {
  notifyProposalAccepted,
  notifyProposalRejected,
  notifyProposalShortlisted,
  notifyUsers,
} from "@/lib/notifications";

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
    title: string | null;
  } | null;
};

function filterStatusKey(status: string | null): FilterType {
  const normalized = (status ?? "").toLowerCase();

  if (normalized === "accepted") return "accepted";
  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "withdrawn" ||
    normalized === "expired"
  ) {
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

type Freelancer = {
  id: string;
  first_name: string | null;
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
    shortlisted: "Kısa listede",
    accepted: "Kabul edildi",
    rejected: "Reddedildi",
    withdrawn: "Freelancer geri çekti",
    expired: "Süresi doldu",
  };

  return labels[status ?? ""] ?? "Bilinmiyor";
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

const skillTagClass = "rounded-full bg-[var(--color-surface-2)] px-2.5 py-0.5 text-xs wrap-anywhere text-[var(--color-text-secondary)]";

function OfferSkills({ skills, detailsId, expanded, onToggle }: {
  skills: string[];
  detailsId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const extraSkills = skills.slice(5);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)]">Yetenekler</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {skills.slice(0, 5).map((skill, index) => <span key={index} className={skillTagClass}>{skill}</span>)}
        {extraSkills.length > 0 && (
          <>
            <div id={detailsId} hidden={!expanded} className={expanded ? "contents" : undefined}>
              {extraSkills.map((skill, index) => <span key={index} className={skillTagClass}>{skill}</span>)}
            </div>
            <button type="button" aria-controls={detailsId} aria-expanded={expanded}
              aria-label={expanded ? "Ek yetenekleri gizle" : `${extraSkills.length} ek yeteneği göster`}
              onClick={onToggle}
              className={`${skillTagClass} font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-600)]`}>
              +{extraSkills.length}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ClientProposalsPanel({projectId, embedded = false, onChanged}: {projectId?: string; embedded?: boolean; onChanged?: () => void}) {
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
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(null);
  const proposalDetailsPrefix = useId();
  const [showExtraSkills, setShowExtraSkills] = useState(false);

  function toggleOfferDetails(id: string) {
    setExpandedProposalId(current => current === id ? null : id);
    setShowExtraSkills(false);
  }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    setSentInvitations(projectId ? normalized.filter(item => item.project_id === projectId) : normalized);
    setInvitationsLoading(false);
  }

useEffect(() => {
    void loadSentInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      onChanged?.();
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
          .select("id, title, client_id, status, commission_rate")
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

        // budget_breakdown artık doğrudan sütun olarak okunamaz (bkz.
        // supabase/migrations/202609300006_budget_breakdown_privacy.sql).
        const budgetByProjectId = new Map(
          await Promise.all(
            projectIds.map(
              async (id) => [id, await fetchBudgetBreakdown(supabase, id)] as const
            )
          )
        );

        // Projeleri Map'e çevir
        const projectById = new Map(
          (projects ?? []).map((project) => [
            project.id,
            {
              ...project,
              budget_breakdown: budgetByProjectId.get(project.id) ?? [],
            } as unknown as Project,
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

        setProposals(projectId ? formattedProposals.filter(item => item.project_id === projectId) : formattedProposals);

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
  }, [supabase, projectId]);

  async function updateProposalStatus(
    proposalId: string,
    status: "accepted" | "rejected" | "shortlisted"
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

      // Kısa listeye alma: teklif hâlâ açıktır, ama client'ın favorisi olarak işaretlenir.
      if (status === "shortlisted") {
        const { error: shortlistError } = await supabase
          .from("proposals")
          .update({ status: "shortlisted" })
          .eq("id", proposalId)
          .eq("status", "pending");

        if (shortlistError) {
          console.error("TEKLİF KISA LİSTEYE ALMA HATASI:", shortlistError);
          setError("Teklif kısa listeye alınamadı. Lütfen tekrar deneyin.");
          return;
        }

        await notifyProposalShortlisted(supabase, {
          freelancerId: proposal.freelancer_id,
          proposalId,
          projectTitle: proposal.project?.title ?? "Proje",
        });

        setProposals((current) =>
          current.map((item) =>
            item.id === proposalId ? { ...item, status: "shortlisted" } : item
          )
        );

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
          .in("status", ["pending", "shortlisted"]);

        if (proposalError) {
          console.error(
            "TEKLİF REDDETME HATASI:",
            proposalError
          );

          setError(
            "Teklif reddedilemedi. Lütfen tekrar deneyin."
          );
          return;
        }

        await notifyProposalRejected(supabase, {
          freelancerId: proposal.freelancer_id,
          proposalId,
          projectTitle: proposal.project?.title ?? "Proje",
        });

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
          "Mevcut ekip kontrol edilemedi. Lütfen tekrar deneyin."
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
        // Teşhis amaçlı genişletilmiş log — davranışı değiştirmez.
        // PostgrestError tipinde `status`/`statusText` yok; bu alanlar
        // yalnızca bazı network/edge hatalarında ham nesnede bulunabilir,
        // bu yüzden güvenli bir şekilde `unknown` üzerinden okunuyor.
        const rawError = acceptError as unknown as Record<string, unknown>;

        console.error("TEKLİF KABUL HATASI:", {
          raw: acceptError,
          message: acceptError.message,
          code: acceptError.code,
          details: acceptError.details,
          hint: acceptError.hint,
          status: rawError.status,
          statusText: rawError.statusText,
          json: (() => {
            try {
              return JSON.stringify(acceptError);
            } catch {
              return "[JSON.stringify başarısız]";
            }
          })(),
        });

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
          .in("status", ["pending", "shortlisted"])
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

      const wasOpen = proposal.project.status === "open";

      const { projectReady, error: readinessError } = await checkAndUpdateProjectReadiness(
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

      await notifyProposalAccepted(supabase, {
        freelancerId: proposal.freelancer_id,
        proposalId: proposal.id,
        projectTitle: proposal.project?.title ?? "Proje",
      });

      // Bu kabulle birlikte tüm roller ilk defa doldu (open -> ready_to_start)
      // ise client'a "Ekip hazır" bildirimi gönder — sonraki kabullerde
      // (proje zaten ready_to_start ise) tekrar gönderilmez.
      if (!readinessError && projectReady && wasOpen) {
        await notifyUsers(supabase, [
          {
            userId: proposal.project.client_id,
            type: "coalition_ready",
            title: "Ekip hazır",
            message: `"${proposal.project?.title ?? "Proje"}" projesi için tüm roller dolduruldu. Projeyi başlatabilirsin.`,
            link: `/client/projects/${proposal.project_id}`,
          },
        ]);
      }

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
            (item.status === "pending" || item.status === "shortlisted")
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
      onChanged?.();
    }
  }

  return (
    <div className="w-full">
      <div className="w-full">
        {!embedded && <div className={pageHeaderClass}>
          <h1 className="cc-page-title font-semibold text-[var(--color-text-primary)]">
            Teklifler
          </h1>

          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Freelancerlardan gelen teklifleri ve ekiplere gönderdiğiniz
            davetleri buradan yönetin.
          </p>
        </div>}

        {/* Üst tablar: Gelen / Gönderilen */}
<Tabs className="mb-6" value={activeTab} onChange={value=>setActiveTab(value as typeof activeTab)} items={[{value:"received",label:"Gelen Teklifler",count:receivedCounts.all,icon:<ArrowDownToLine size={16}/>},{value:"sent",label:"Gönderilen Teklifler",count:sentCounts.all,icon:<ArrowUpFromLine size={16}/> }]} />

        {/* Alt tablar: Tümü / Bekleyen / Kabul Edilen / Reddedilen */}
        <FilterBar label="Teklif durumuna göre filtrele" value={filterValue} onChange={value=>setFilterValue(value as typeof filterValue)} items={[{value:"all",label:"Tümü",count:counts.all},{value:"pending",label:"Bekleyen",count:counts.pending},{value:"accepted",label:"Kabul Edilen",count:counts.accepted},{value:"rejected",label:"Reddedilen",count:counts.rejected}]} />

        {activeTab === "received" && loading && (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-[var(--space-6)] text-sm text-[var(--color-text-secondary)]">
            <Loader2 size={18} className="animate-spin" />
            Teklifler yükleniyor...
          </div>
        )}

        {activeTab === "received" && !loading && error && (
          <div className="mt-6 flex gap-3 rounded-[var(--radius-card)] bg-[var(--color-error-50)] p-4 text-sm text-[var(--color-error-600)]">
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
          <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-[var(--space-6)] text-center">
            <Send className="mx-auto text-[var(--color-text-muted)]" />

            <h2 className="mt-4 cc-h2 font-semibold text-[var(--color-text-primary)]">
              {receivedFilter === "all"
                ? "Henüz teklif gelmedi"
                : "Bu kategoride teklif bulunmuyor"}
            </h2>

            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Projeleriniz yayınlandığında freelancerların
              teklifleri burada görünür.
            </p>
          </div>
        )}

        {activeTab === "received" && !loading && !error && (
        <div className="mt-8 space-y-3">
          {filteredProposals.map((proposal) => {
            const detailsId = `${proposalDetailsPrefix}-${proposal.id}`;
            const isExpanded = expandedProposalId === detailsId;
            const amount = proposal.bid_amount !== null && Number.isFinite(Number(proposal.bid_amount))
              ? formatCurrency(Number(proposal.bid_amount))
              : "Belirtilmedi";

            return (
              <ProposalCard
                key={proposal.id}
                title={proposal.freelancer ? publicDisplayName(proposal.freelancer, "Freelancer") : "Freelancer bilgisi bulunamadı"}
                titleHref={proposal.freelancer ? `/client/freelancers/${proposal.freelancer.id}` : undefined}
                subtitle={proposal.project?.title ?? "Proje"}
                projectHref={proposal.project ? `/client/projects/${proposal.project.id}` : undefined}
                status={proposal.status}
                statusLabel={statusLabel(proposal.status)}
                metrics={[
                  { label: "Teklif Tutarı", value: amount },
                  { label: "Teslim süresi", value: proposal.delivery_days ? `${proposal.delivery_days} gün` : "Belirtilmedi" },
                ]}
                detailsId={detailsId}
                expanded={isExpanded}
                onToggle={() => toggleOfferDetails(detailsId)}
                actions={
                  <>
                    {(proposal.status === "pending" || proposal.status === "shortlisted") && (
                      <>
                        {proposal.status === "pending" && (
                          <button
                            type="button"
                            disabled={updatingId === proposal.id}
                            onClick={() => void updateProposalStatus(proposal.id, "shortlisted")}
                            className={buttonClasses({variant:"secondary", size:"sm", className:"@min-[46rem]:w-32"})}
                          >
                            Kısa listeye al
                          </button>
                        )}

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
                          className={buttonClasses({variant:"primary", size:"sm", className:"@min-[46rem]:w-20"})}
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
                          className={buttonClasses({variant:"ghost", size:"sm", className:"@min-[46rem]:w-[4.5rem]"})}
                        >
                          Reddet
                        </button>
                      </>
                    )}

                    {proposal.status === "accepted" && (
                      <Link
                        href={`/client/messages?user=${proposal.freelancer_id}&proposal=${proposal.id}`}
                        className={buttonClasses({variant:"primary", size:"sm", className:"@min-[46rem]:w-32"})}
                      >
                        <MessageCircle size={15} />
                        Mesaj Gönder
                      </Link>
                    )}
                  </>
                }
                metadata={<>
                  {proposal.freelancer?.title && <span>{proposal.freelancer.title}</span>}
                  {proposal.freelancer && (
                    <span>{AVAILABILITY_LABEL[proposal.freelancer.availability_status ?? "available"] ?? AVAILABILITY_LABEL.available}</span>
                  )}
                  <span>{proposal.role || "Rol belirtilmemiş"}</span>
                  {proposal.project?.status && <span>{projectStatusLabel(proposal.project.status)}</span>}
                </>}
                message={{ label: "Teklif mesajı", text: proposal.cover_letter || "Teklif mesajı eklenmemiş." }}
              >
                {!!proposal.freelancer?.skills?.length && (
                  <OfferSkills skills={proposal.freelancer.skills}
                    detailsId={`${detailsId}-skills`}
                    expanded={isExpanded && showExtraSkills}
                    onToggle={() => setShowExtraSkills(current => !current)} />
                )}
              </ProposalCard>
            );
          })}
        </div>
        )}

        {/* GÖNDERİLEN TEKLİFLER (ekip davetleri) */}
        {activeTab === "sent" && invitationsLoading && (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-[var(--space-6)] text-sm text-[var(--color-text-secondary)]">
            <Loader2 size={18} className="animate-spin" />
            Davetler yükleniyor...
          </div>
        )}

        {activeTab === "sent" && !invitationsLoading && invitationsError && (
          <div className="mt-6 flex gap-3 rounded-[var(--radius-card)] bg-[var(--color-error-50)] p-4 text-sm text-[var(--color-error-600)]">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>{invitationsError}</div>
          </div>
        )}

        {activeTab === "sent" &&
          !invitationsLoading &&
          !invitationsError &&
          filteredSentInvitations.length === 0 && (
            <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-[var(--space-6)] text-center">
              <ArrowUpFromLine className="mx-auto text-[var(--color-text-muted)]" />

              <h2 className="mt-4 cc-h2 font-semibold text-[var(--color-text-primary)]">
                {sentFilter === "all"
                  ? "Henüz bir freelancer'a davet göndermediniz"
                  : "Bu kategoride davet bulunmuyor"}
              </h2>

              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Eşleşme sonuçlarından bir freelancer&apos;ı ekibinize davet
                ettiğinizde burada görünür.
              </p>
            </div>
          )}

        {activeTab === "sent" && !invitationsLoading && !invitationsError && (
          <div className="mt-8 space-y-3">
            {filteredSentInvitations.map((invitation) => {
              const detailsId = `${proposalDetailsPrefix}-invitation-${invitation.id}`;
              return (
                <ProposalCard
                  key={invitation.id}
                  title={invitation.freelancer ? publicDisplayName(invitation.freelancer, "Freelancer") : "Freelancer bilgisi bulunamadı"}
                  titleHref={invitation.freelancer ? `/client/freelancers/${invitation.freelancer.id}` : undefined}
                  subtitle={invitation.project?.title ?? "Proje"}
                  projectHref={invitation.project ? `/client/projects/${invitation.project.id}` : undefined}
                  status={invitation.status}
                  statusLabel={invitationStatusLabel(invitation.status)}
                  metrics={[
                    { label: "Davet bütçesi", value: invitation.budget_per_person !== null ? formatCurrency(invitation.budget_per_person) : "Belirtilmedi" },
                    { label: "Süre", value: invitation.duration || "Belirtilmedi" },
                  ]}
                  detailsId={detailsId}
                  expanded={expandedProposalId === detailsId}
                  onToggle={() => toggleOfferDetails(detailsId)}
                  actions={
                    <>
                      {filterStatusKey(invitation.status) === "pending" && (
                        <button
                          type="button"
                          disabled={cancellingId === invitation.id}
                          onClick={() =>
                            void cancelInvitation(invitation.id)
                          }
                          className={buttonClasses({
                            variant: "ghost",
                            size: "sm",
                            className: "@min-[46rem]:w-32 border border-[var(--color-error-600)] bg-[var(--color-surface-1)]! text-[var(--color-error-600)]! enabled:hover:bg-[var(--color-error-50)]! enabled:hover:text-[color-mix(in_srgb,var(--color-error-600),black_25%)]! focus-visible:ring-[var(--color-error-600)]! disabled:opacity-60",
                          })}
                        >
                          {cancellingId === invitation.id
                            ? "İşleniyor..."
                            : "Daveti İptal Et"}
                        </button>
                      )}

                      {invitation.status === "accepted" && (
                        <Link
                          href={`/client/messages?user=${invitation.freelancer_id}&project=${invitation.project_id}`}
                          className={buttonClasses({ variant: "primary", size: "sm", className: "@min-[46rem]:w-32" })}
                        >
                          <MessageCircle size={15} />
                          Mesaj Gönder
                        </Link>
                      )}
                    </>
                  }
                  metadata={<>
                    {invitation.freelancer?.title && <span>{invitation.freelancer.title}</span>}
                    <span>{invitation.role}</span>
                  </>}
                  message={{ label: "Davet mesajı", text: invitation.message || "Davet mesajı eklenmemiş." }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
