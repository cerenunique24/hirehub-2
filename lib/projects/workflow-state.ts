export type WorkflowViewerRole = "client" | "freelancer";

export type WorkflowMilestone = {
  id: string;
  title: string;
  status: "pending" | "active" | "submitted" | "in_review" | "revision" | "approved";
  freelancer_id: string | null;
};

export type ProjectWorkflowState = {
  state: string;
  actionOwner: "Client" | "Freelancer" | "Ekip" | "Kimse" | "Client / Ekip";
  nextStep: string;
  currentUserMustAct: boolean;
};

/** Shared client/freelancer project state derived from persisted project and milestone rows. */
export function resolveProjectWorkflowState(input: {
  projectStatus: string | null;
  viewerRole: WorkflowViewerRole;
  isTeamProject: boolean;
  milestones: WorkflowMilestone[];
  currentUserId: string | null;
  teamMemberIds: string[];
}): ProjectWorkflowState {
  const { projectStatus, viewerRole, isTeamProject, milestones, currentUserId, teamMemberIds } = input;

  if (projectStatus === "open") {
    return {
      state: isTeamProject ? "Ekip kuruluyor" : "Freelancer bekleniyor",
      actionOwner: "Ekip",
      nextStep: viewerRole === "client"
        ? "Başvuruları değerlendir veya eksik rollere freelancer davet et."
        : "Proje ekibinin tamamlanmasını bekle; çalışma henüz başlamadı.",
      currentUserMustAct: false,
    };
  }

  if (projectStatus === "ready_to_start") {
    return {
      state: "Ekip hazır · Başlamadı",
      actionOwner: "Client",
      nextStep: viewerRole === "client"
        ? "Gereksinimleri gözden geçirip projeyi başlat."
        : "Client projeyi başlatınca çalışma alanında ilk aşamana geç.",
      currentUserMustAct: viewerRole === "client",
    };
  }

  if (projectStatus === "completed") {
    return { state: "Tamamlandı", actionOwner: "Kimse", nextStep: "Proje tamamlandı; değerlendirme ve ödeme özetini kontrol et.", currentUserMustAct: false };
  }
  if (projectStatus === "cancelled") {
    return { state: "İptal edildi", actionOwner: "Kimse", nextStep: "Bu projede yeni işlem yapılamaz.", currentUserMustAct: false };
  }
  if (projectStatus === "paused") {
    return { state: "Duraklatıldı", actionOwner: "Ekip", nextStep: "Proje duraklatıldı; yönetim panelindeki açık talebi takip et.", currentUserMustAct: false };
  }
  if (projectStatus !== "in_progress") {
    return { state: "Durum doğrulanıyor", actionOwner: "Ekip", nextStep: "Proje durumu güncellenene kadar bekle.", currentUserMustAct: false };
  }

  if (milestones.length === 0) {
    const owner = isTeamProject ? "Freelancer" : "Client";
    const ownsAction = viewerRole === owner.toLowerCase();
    return {
      state: "Aşamalar tanımlanmadı",
      actionOwner: owner,
      nextStep: ownsAction ? "İşe başlamadan önce ilk proje aşamasını oluştur." : `${owner}, ilk proje aşamasını oluşturmalı.`,
      currentUserMustAct: ownsAction,
    };
  }

  const reviewQueue = milestones.filter((milestone) => milestone.status === "submitted" || milestone.status === "in_review");
  if (viewerRole === "client" && reviewQueue.length > 0) {
    return {
      state: "Teslim müşteri incelemesinde",
      actionOwner: "Client",
      nextStep: `“${reviewQueue[0].title}” aşamasını incele; onayla veya revizyon iste.`,
      currentUserMustAct: true,
    };
  }

  if (viewerRole === "freelancer") {
    const ownMilestones = isTeamProject
      ? milestones.filter((milestone) => milestone.freelancer_id === currentUserId)
      : milestones;
    const ownAction = ownMilestones.find((milestone) => milestone.status === "active" || milestone.status === "revision" || milestone.status === "pending");
    if (ownAction) {
      const nextStep = ownAction.status === "revision"
        ? `“${ownAction.title}” aşamasının revizyonunu yeniden teslim et.`
        : ownAction.status === "pending"
          ? `“${ownAction.title}” aşamasını başlat.`
          : `“${ownAction.title}” aşamasındaki çalışmanı teslim et.`;
      return { state: ownAction.status === "revision" ? "Revizyon bekliyor" : "Freelancer çalışıyor", actionOwner: "Freelancer", nextStep, currentUserMustAct: true };
    }
  }

  const allApproved = milestones.every((milestone) => milestone.status === "approved") &&
    (!isTeamProject || (teamMemberIds.length > 0 && teamMemberIds.every((id) => milestones.some((milestone) => milestone.freelancer_id === id))));
  if (allApproved) {
    return {
      state: "Tüm aşamalar onaylandı",
      actionOwner: "Client",
      nextStep: viewerRole === "client" ? "Projeyi tamamla ve değerlendirme adımına geç." : "Client projeyi tamamlayınca değerlendirme adımına geç.",
      currentUserMustAct: viewerRole === "client",
    };
  }

  return {
    state: "Çalışma devam ediyor",
    actionOwner: viewerRole === "client" ? "Freelancer" : "Client / Ekip",
    nextStep: viewerRole === "client" ? "Freelancer teslimini bekle veya mesajla ilerlemeyi netleştir." : "Diğer aşama sahibinin veya client incelemesinin tamamlanmasını bekle.",
    currentUserMustAct: false,
  };
}
