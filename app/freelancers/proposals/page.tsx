"use client";

import Link from "next/link";
import { DashboardMascot } from "@/components/dashboard/DashboardMascot";
import { panelRootClass, PanelBadge } from "@/components/dashboard/PanelPrimitives";
import { buttonClasses } from "@/components/ui/Button";
import styles from "@/components/proposals/Proposals.module.css";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  checkAndUpdateProjectReadiness,
  describeAcceptPlacementError,
} from "@/lib/projects/teamReadiness";
import { notifyUsers } from "@/lib/notifications";

type Proposal = {
  id: string;
  project_id: string;
  role: string | null;
  bid_amount: number;
  delivery_days: number;
  cover_letter: string;
  status: string;
  created_at: string;
  project: {
    id: string;
    title: string;
    project_type: string | null;
    budget: number | null;
    client_id: string;
  } | null;
};

type Invitation = {
  id: string;
  project_id: string;
  client_id: string;
  role: string;
  budget_per_person: number | null;
  duration: string | null;
  message: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  project: {
    id: string;
    title: string;
    project_type: string | null;
  } | null;
};

type TopTab = "sent" | "received";
type FilterType = "all" | "pending" | "shortlisted" | "accepted" | "rejected";

function getStatusKey(status: string): FilterType {
  const normalized = status.toLowerCase();

  if (
    normalized === "accepted" ||
    normalized === "kabul edildi" ||
    normalized === "kabul_edildi"
  ) {
    return "accepted";
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "withdrawn" ||
    normalized === "expired" ||
    normalized === "reddedildi"
  ) {
    return "rejected";
  }

  return "pending";
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "cancelled") return "İptal Edildi";
  if (normalized === "shortlisted") return "Kısa Listede";
  if (normalized === "withdrawn") return "Geri Çekildi";
  if (normalized === "expired") return "Süresi Doldu";

  const key = getStatusKey(status);

  if (key === "accepted") return "Kabul Edildi";
  if (key === "rejected") return "Reddedildi";

  return "Bekleyen";
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function OffersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<TopTab>("sent");
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Teklif gönderimi sonrası yönlendirmenin (artık router.push ile, tam
  // sayfa yeniden yüklemesi olmadan) başarı state'i taşıyabilmesi için.
  // useSearchParams yerine düz URL okuma kullanılır — Suspense sınırı
  // gerektirmeden, bu sayfanın mevcut yapısını değiştirmeden çalışır.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "received") setActiveTab("received");
    if (params.get("submitted") === "1") {
      setJustSubmitted(true);
      params.delete("submitted");
      const query = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
    }
  }, []);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState("");
  const [proposalFilter, setProposalFilter] =
    useState<FilterType>("all");

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState("");
  const [invitationFilter, setInvitationFilter] =
    useState<FilterType>("all");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    void loadProposals();
    void loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProposals() {
    setProposalsLoading(true);
    setProposalsError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProposals([]);
      setProposalsError("Oturum bilgisi bulunamadı.");
      setProposalsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("proposals")
      .select(
        `
          id,
          project_id,
          role,
          bid_amount,
          delivery_days,
          cover_letter,
          status,
          created_at,
          project:projects (
            id,
            title,
            project_type,
            budget,
            client_id
          )
        `
      )
      .eq("freelancer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Proposals load error:", error);
      setProposals([]);
      setProposalsError("Gönderdiğin teklifler yüklenirken bir hata oluştu.");
      setProposalsLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedData: Proposal[] = (data ?? []).map((item: any) => ({
      id: item.id,
      project_id: item.project_id,
      role: item.role ?? null,
      bid_amount: Number(item.bid_amount),
      delivery_days: Number(item.delivery_days),
      cover_letter: item.cover_letter,
      status: item.status,
      created_at: item.created_at,
      project: Array.isArray(item.project)
        ? item.project[0] ?? null
        : item.project ?? null,
    }));

    setProposals(normalizedData);
    setProposalsLoading(false);
  }

  async function loadInvitations() {
    setInvitationsLoading(true);
    setInvitationsError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setInvitations([]);
      setInvitationsError("Oturum bilgisi bulunamadı.");
      setInvitationsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("project_team_invitations")
      .select(
        `
          id,
          project_id,
          client_id,
          role,
          budget_per_person,
          duration,
          message,
          status,
          created_at,
          responded_at,
          project:projects (
            id,
            title,
            project_type
          )
        `
      )
      .eq("freelancer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Invitations load error:", error);
      setInvitations([]);
      setInvitationsError("Gelen teklifler yüklenirken bir hata oluştu.");
      setInvitationsLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedData: Invitation[] = (data ?? []).map((item: any) => ({
      id: item.id,
      project_id: item.project_id,
      client_id: item.client_id,
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
    }));

    setInvitations(normalizedData);
    setInvitationsLoading(false);
  }

  async function respondToInvitation(
    invitation: Invitation,
    status: "accepted" | "rejected"
  ) {
    setRespondingId(invitation.id);
    setInvitationsError("");

    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;

      if (!userId) {
        setInvitationsError("Oturum bilgisi bulunamadı.");
        return;
      }

      if (status === "rejected") {
        const { error: updateError } = await supabase
          .from("project_team_invitations")
          .update({
            status: "rejected",
            responded_at: new Date().toISOString(),
          })
          .eq("id", invitation.id)
          .eq("status", "pending");

        if (updateError) {
          console.error("Invitation update error:", updateError);
          setInvitationsError("Teklif güncellenemedi.");
          return;
        }

        await notifyUsers(supabase, [
          {
            userId: invitation.client_id,
            type: "invitation_rejected",
            title: "Davet reddedildi",
            message: `"${invitation.project?.title ?? "Proje"}" için gönderdiğin davet reddedildi.`,
            link: "/client/proposals",
          },
        ]);
      }

      if (status === "accepted") {
        // Rol kapasitesi (memberCount) ve tekrar üyelik kontrolü, hem bu
        // akış hem de client'ın teklif kabul akışı tarafından kullanılan
        // TEK, atomik ve race-condition'a dayanıklı DB fonksiyonunda
        // (accept_project_placement) yapılıyor. Buradaki client kodu bu
        // sonucu sadece UI'a yansıtır; yetkilendirme sınırı burası değildir.
        const { error: acceptError } = await supabase.rpc(
          "accept_project_placement",
          { p_source: "invitation", p_source_id: invitation.id }
        );

        if (acceptError) {
          console.error("Invitation acceptance error:", acceptError);
          setInvitationsError(describeAcceptPlacementError(acceptError.message));
          return;
        }

        // Davetle katılım da tüm rolleri doldurabilir; proposal kabul
        // akışıyla aynı hazırlık kontrolünü burada da çalıştırıyoruz.
        const { data: projectBefore } = await supabase
          .from("projects")
          .select("status")
          .eq("id", invitation.project_id)
          .maybeSingle();

        const wasOpen = projectBefore?.status === "open";

        const { projectReady, error: readinessError } = await checkAndUpdateProjectReadiness(
          supabase,
          invitation.project_id
        );

        if (readinessError) {
          console.error("Project readiness check error:", readinessError);
        }

        await notifyUsers(supabase, [
          {
            userId: invitation.client_id,
            type: "invitation_accepted",
            title: "Davet kabul edildi",
            message: `"${invitation.project?.title ?? "Proje"}" için gönderdiğin davet kabul edildi.`,
            link: `/client/projects/${invitation.project_id}`,
          },
        ]);

        if (!readinessError && projectReady && wasOpen) {
          await notifyUsers(supabase, [
            {
              userId: invitation.client_id,
              type: "coalition_ready",
              title: "Ekip hazır",
              message: `"${invitation.project?.title ?? "Proje"}" projesi için tüm roller dolduruldu. Projeyi başlatabilirsin.`,
              link: `/client/projects/${invitation.project_id}`,
            },
          ]);
        }
      }

      setInvitations((current) =>
        current.map((item) =>
          item.id === invitation.id
            ? {
                ...item,
                status,
                responded_at: new Date().toISOString(),
              }
            : item
        )
      );
    } finally {
      setRespondingId(null);
    }
  }

  const proposalCounts = useMemo(() => {
    return {
      all: proposals.length,
      shortlisted: proposals.filter(item => item.status.toLowerCase() === "shortlisted").length,
      pending: proposals.filter(
        (item) => getStatusKey(item.status) === "pending"
      ).length,
      accepted: proposals.filter(
        (item) => getStatusKey(item.status) === "accepted"
      ).length,
      rejected: proposals.filter(
        (item) => getStatusKey(item.status) === "rejected"
      ).length,
    };
  }, [proposals]);

  const invitationCounts = useMemo(() => {
    return {
      all: invitations.length,
      shortlisted: 0,
      pending: invitations.filter(
        (item) => getStatusKey(item.status) === "pending"
      ).length,
      accepted: invitations.filter(
        (item) => getStatusKey(item.status) === "accepted"
      ).length,
      rejected: invitations.filter(
        (item) => getStatusKey(item.status) === "rejected"
      ).length,
    };
  }, [invitations]);

  const filteredProposals = useMemo(() => {
    if (proposalFilter === "all") return proposals;
    if (proposalFilter === "shortlisted") return proposals.filter(item => item.status.toLowerCase() === "shortlisted");
    return proposals.filter(
      (item) => getStatusKey(item.status) === proposalFilter
    );
  }, [proposals, proposalFilter]);

  const filteredInvitations = useMemo(() => {
    if (invitationFilter === "all") return invitations;
    return invitations.filter(
      (item) => getStatusKey(item.status) === invitationFilter
    );
  }, [invitations, invitationFilter]);

  const counts = activeTab === "sent" ? proposalCounts : invitationCounts;
  const filterValue =
    activeTab === "sent" ? proposalFilter : invitationFilter;
  const setFilterValue =
    activeTab === "sent" ? setProposalFilter : setInvitationFilter;

  return (
    <main className={[panelRootClass, styles.page].join(" ")}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Tekliflerim</h1>
          <p>Gönderdiğin teklifleri takip et, gelen davetlerini incele ve yeni fırsatlara hazırlan.</p>
        </div>
        <DashboardMascot pose="pencil" size={160} className={styles.mascot} eager />
      </header>

      {justSubmitted && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Teklifin başarıyla gönderildi. Client teklifini incelediğinde bildirim alacaksın.
        </div>
      )}

      {/* Üst tablar: Gönderilen / Gelen */}
      <div className={`cc-horizontal-nav ${styles.typeTabs}`}>
        <button
          type="button"
          aria-pressed={activeTab === "sent"}
          onClick={() => setActiveTab("sent")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "sent"
              ? "border-[var(--color-primary-600)] text-[var(--color-primary-600)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <ArrowUpFromLine className="h-4 w-4" />
          Gönderilen Teklifler
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {proposalCounts.all}
          </span>
        </button>

        <button
          type="button"
          aria-pressed={activeTab === "received"}
          onClick={() => setActiveTab("received")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "received"
              ? "border-[var(--color-primary-600)] text-[var(--color-primary-600)]"
              : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Gelen Teklifler
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {invitationCounts.all}
          </span>
        </button>
      </div>

      <div className={styles.filters} role="group" aria-label="Teklif durumuna göre filtrele">
        {[
          { value: "all", label: "Tümü" },
          { value: "pending", label: "Bekleyen" },
          ...(activeTab === "sent" ? [{ value: "shortlisted", label: "Kısa Listede" }] : []),
          { value: "accepted", label: "Kabul Edilen" },
          { value: "rejected", label: "Reddedilen" },
        ].map(filter => <button key={filter.value} type="button"
          onClick={() => setFilterValue(filter.value as FilterType)}
          aria-pressed={filterValue === filter.value}
          className={filterValue === filter.value ? styles.selected : ""}>
          {filter.label}<span>{counts[filter.value as FilterType]}</span>
        </button>)}
      </div>

      {/* GÖNDERİLEN TEKLİFLER */}
      {activeTab === "sent" && (
        <>
          {proposalsLoading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              Tekliflerin yükleniyor...
            </div>
          )}

          {!proposalsLoading && proposalsError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
              <h2 className="font-medium text-red-800">
                Teklifler yüklenemedi
              </h2>
              <p className="mt-2 text-sm text-red-600">{proposalsError}</p>
              <button
                type="button"
                onClick={() => void loadProposals()}
                className={buttonClasses({variant:"primary",size:"sm",className:"mt-5"})}
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!proposalsLoading &&
            !proposalsError &&
            filteredProposals.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {proposalFilter === "all"
                    ? "Henüz teklif göndermedin"
                    : "Bu kategoride teklif bulunmuyor"}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  {proposalFilter === "all"
                    ? "Projeleri keşfet ve sana uygun projelere teklif gönder."
                    : "Farklı bir filtre seçerek diğer tekliflerini görebilirsin."}
                </p>

                {proposalFilter === "all" && (
                  <Link
                    href="/freelancers/discover"
                    className={buttonClasses({variant:"primary",size:"sm",className:"mt-5"})}
                  >
                    Projeleri Keşfet
                  </Link>
                )}
              </div>
            )}

          {!proposalsLoading &&
            !proposalsError &&
            filteredProposals.length > 0 && (
              <div className={styles.list}>
                {filteredProposals.map((proposal) => {
                  const project = proposal.project;

                  return (
                    <div
                      key={proposal.id}
                      className={styles.proposalCard}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {project?.title ?? "Proje bulunamadı"}
                          </h2>

                          <PanelBadge>{getStatusLabel(proposal.status)}</PanelBadge>
                        </div>

                        <p className="mb-5 text-sm text-gray-500">
                          {proposal.role || project?.project_type || "Rol belirtilmedi"}
                        </p>

                        {proposal.cover_letter && <p className={styles.summary}>{proposal.cover_letter}</p>}
                        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
                          <div>
                            <span className="mb-1 block text-gray-400">
                              Teklif Tutarı
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatPrice(proposal.bid_amount)}
                            </span>
                          </div>

                          <div>
                            <span className="mb-1 block text-gray-400">
                              Teslim Süresi
                            </span>
                            <span className="font-medium text-gray-900">
                              {proposal.delivery_days} gün
                            </span>
                          </div>

                          <div>
                            <span className="mb-1 block text-gray-400">
                              Gönderim Tarihi
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatDate(proposal.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        {project?.client_id && (
                          <Link
                            href={`/freelancers/messages?user=${project.client_id}&proposal=${proposal.id}`}
                            className={buttonClasses({variant:"primary",size:"sm",className:""})}
                          >
                            Mesajlar
                          </Link>
                        )}

                        <Link
                          href={`/freelancers/proposals/${proposal.id}`}
                          className={buttonClasses({variant:"secondary",size:"sm"})}
                        >
                          Teklifimi Göster
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </>
      )}

      {/* GELEN TEKLİFLER (ekip davetleri) */}
      {activeTab === "received" && (
        <>
          {invitationsLoading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              Davetlerin yükleniyor...
            </div>
          )}

          {!invitationsLoading && invitationsError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
              <h2 className="font-medium text-red-800">
                Davetler yüklenemedi
              </h2>
              <p className="mt-2 text-sm text-red-600">
                {invitationsError}
              </p>
              <button
                type="button"
                onClick={() => void loadInvitations()}
                className={buttonClasses({variant:"primary",size:"sm",className:"mt-5"})}
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {!invitationsLoading &&
            !invitationsError &&
            filteredInvitations.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {invitationFilter === "all"
                    ? "Henüz bir ekip daveti almadın"
                    : "Bu kategoride davet bulunmuyor"}
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Bir client seni bir projeye davet ettiğinde burada
                  görünecek.
                </p>
              </div>
            )}

          {!invitationsLoading &&
            !invitationsError &&
            filteredInvitations.length > 0 && (
              <div className="space-y-5">
                {filteredInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className={styles.invitationCard}
                  >
                    <div className={styles.invitationRow}>
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold text-gray-900">
                            {invitation.project?.title ?? "Proje bulunamadı"}
                          </h2>

                          <PanelBadge>{getStatusLabel(invitation.status)}</PanelBadge>
                        </div>

                        <p className="mb-5 text-sm text-gray-500">
                          {invitation.role}
                        </p>

                        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm">
                          {invitation.budget_per_person !== null && (
                            <div>
                              <span className="mb-1 block text-gray-400">
                                Kişi Başı Bütçe
                              </span>
                              <span className="font-medium text-gray-900">
                                {formatPrice(invitation.budget_per_person)}
                              </span>
                            </div>
                          )}

                          {invitation.duration && (
                            <div>
                              <span className="mb-1 block text-gray-400">
                                Süre
                              </span>
                              <span className="font-medium text-gray-900">
                                {invitation.duration}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="mb-1 block text-gray-400">
                              Davet Tarihi
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatDate(invitation.created_at)}
                            </span>
                          </div>
                        </div>

                        {invitation.message && (
                          <p className={styles.summary}>
                            {invitation.message}
                          </p>
                        )}
                      </div>

                      <div className={styles.actions}>
                        <Link
                          href={`/freelancers/messages?user=${invitation.client_id}&project=${invitation.project_id}`}
                          className={buttonClasses({variant:"secondary",size:"sm"})}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Mesaj
                        </Link>

                        {getStatusKey(invitation.status) === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={respondingId === invitation.id}
                              onClick={() =>
                                void respondToInvitation(
                                  invitation,
                                  "accepted"
                                )
                              }
                              className={buttonClasses({variant:"primary",size:"sm",className:""})}
                            >
                              {respondingId === invitation.id
                                ? "İşleniyor..."
                                : "Kabul Et"}
                            </button>

                            <button
                              type="button"
                              disabled={respondingId === invitation.id}
                              onClick={() =>
                                void respondToInvitation(
                                  invitation,
                                  "rejected"
                                )
                              }
                              className={buttonClasses({variant:"secondary",size:"sm"})}
                            >
                              Reddet
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      )}
    </main>
  );
}
