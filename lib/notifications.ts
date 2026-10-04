import type { SupabaseClient } from "@supabase/supabase-js";

import { dispatchNotificationEmail } from "@/lib/email";

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  /**
   * Aynı olayın tekrar tekrar bildirim üretmesini engeller
   * (notifications.user_id + dedupe_key benzersizdir). Verilmezse her çağrı
   * yeni bir bildirim üretir.
   */
  dedupeKey?: string;
};

/**
 * Tek, paylaşılan notification-insert helper'ı. Milestone akışı
 * (lib/projects/milestones.ts) ve proposal/invitation/project-start
 * akışları aynı fonksiyonu kullanır — notifications tablosuna
 * yazan tek yer burasıdır. Her bildirim aynı zamanda e-posta katmanına
 * (şimdilik no-op) iletilir; bkz. lib/email/index.ts.
 *
 * Yazma, `notify_users()` RPC'si üzerinden geçer (bkz. supabase/migrations/
 * 202609300013_notifications_rpc_hardening.sql). Doğrudan çok-satırlı
 * `insert`/`upsert` kullanıldığında, tek bir alıcı için RLS "ilişki"
 * kontrolü başarısız olursa (ör. henüz ilişkisi olmayan bir alıcı) TÜM
 * batch — o olayı dinleyen diğer alıcılar dahil — 42501 ile reddediliyordu.
 * RPC her alıcıyı kendi alt-transaction'ında değerlendirir: ilişkisi
 * olmayan bir alıcı sadece atlanır, diğerlerinin bildirimi etkilenmez.
 */
export async function notifyUsers(supabase: SupabaseClient, notifications: NotificationInput[]) {
  if (notifications.length === 0) return { error: null };

  const payload = notifications.map((n) => ({
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link ?? null,
    dedupeKey: n.dedupeKey ?? null,
  }));

  const { error } = await supabase.rpc("notify_users", { p_notifications: payload });

  // Çağıranların hiçbiri dönen `{ error }`'ı kontrol etmiyordu, bu yüzden
  // bir RLS/DB hatası olduğunda bildirim tamamen sessizce hiç
  // oluşturulmuyordu. Tek, paylaşılan yer burası olduğu için hata en
  // azından burada loglanır — çağıranların ayrıca hata göstermesi
  // gerekmez (bildirim ikincil bir yan etki, ana akışı kesmemeli).
  if (error) {
    console.error(
      "[notifyUsers] Bildirim(ler) oluşturulamadı:",
      error.code,
      error.message,
      notifications.map((n) => ({ userId: n.userId, type: n.type }))
    );
  } else {
    void Promise.all(
      notifications.map((n) =>
        dispatchNotificationEmail({
          userId: n.userId,
          type: n.type,
          subject: n.title,
          body: n.message,
          link: n.link,
        })
      )
    );
  }

  return { error };
}

/* -------------------------------------------------------------------------
 * Olay tabanlı merkezi bildirim fonksiyonları.
 *
 * Sayfalar bildirim metinlerini kendileri yazmaz; olayın adını çağırır.
 * Böylece metin/link/dedupe kuralı tek yerde durur ve e-posta sağlayıcısı
 * bağlandığında hiçbir çağıran değişmez.
 * ---------------------------------------------------------------------- */

const CLIENT_PROJECT_LINK = (projectId: string) => `/client/projects/${projectId}`;
const FREELANCER_PROJECT_LINK = (projectId: string) => `/freelancers/projects/${projectId}`;

export function notifyProposalSubmitted(
  supabase: SupabaseClient,
  input: { clientId: string; freelancerId: string; projectId: string; projectTitle: string }
) {
  return notifyUsers(supabase, [
    {
      userId: input.clientId,
      type: "proposal_received",
      title: "Yeni teklif aldın",
      message: `"${input.projectTitle}" projen için yeni bir teklif geldi.`,
      link: "/client/proposals",
      dedupeKey: `proposal_received:${input.projectId}:${input.freelancerId}`,
    },
  ]);
}

export function notifyProposalShortlisted(
  supabase: SupabaseClient,
  input: { freelancerId: string; proposalId: string; projectTitle: string }
) {
  return notifyUsers(supabase, [
    {
      userId: input.freelancerId,
      type: "proposal_shortlisted",
      title: "Teklifin kısa listeye alındı",
      message: `"${input.projectTitle}" için gönderdiğin teklif kısa listeye alındı.`,
      link: "/freelancers/proposals",
      dedupeKey: `proposal_shortlisted:${input.proposalId}`,
    },
  ]);
}

export function notifyProposalAccepted(
  supabase: SupabaseClient,
  input: { freelancerId: string; proposalId: string; projectTitle: string }
) {
  return notifyUsers(supabase, [
    {
      userId: input.freelancerId,
      type: "proposal_accepted",
      title: "Teklifin kabul edildi",
      message: `"${input.projectTitle}" projesindeki teklifin kabul edildi.`,
      link: "/freelancers/projects",
      dedupeKey: `proposal_accepted:${input.proposalId}`,
    },
  ]);
}

export function notifyProposalRejected(
  supabase: SupabaseClient,
  input: { freelancerId: string; proposalId: string; projectTitle: string }
) {
  return notifyUsers(supabase, [
    {
      userId: input.freelancerId,
      type: "proposal_rejected",
      title: "Teklifin reddedildi",
      message: `"${input.projectTitle}" için gönderdiğin teklif reddedildi.`,
      link: "/freelancers/proposals",
      dedupeKey: `proposal_rejected:${input.proposalId}`,
    },
  ]);
}

export function notifyProjectStarted(
  supabase: SupabaseClient,
  input: { freelancerIds: string[]; projectId: string; projectTitle: string }
) {
  return notifyUsers(
    supabase,
    input.freelancerIds.map((freelancerId) => ({
      userId: freelancerId,
      type: "project_started",
      title: "Proje başladı",
      message: `"${input.projectTitle}" projesi başlatıldı.`,
      link: FREELANCER_PROJECT_LINK(input.projectId),
      dedupeKey: `project_started:${input.projectId}:${freelancerId}`,
    }))
  );
}

export function notifyDeliverySubmitted(
  supabase: SupabaseClient,
  input: { clientId: string; projectId: string; milestoneId: string; milestoneTitle: string; attemptNo: number }
) {
  return notifyUsers(supabase, [
    {
      userId: input.clientId,
      type: "milestone_submitted",
      title: "Yeni teslim var",
      message: `"${input.milestoneTitle}" aşaması teslim edildi.`,
      link: CLIENT_PROJECT_LINK(input.projectId),
      dedupeKey: `milestone_submitted:${input.milestoneId}:${input.attemptNo}`,
    },
  ]);
}

export function notifyRevisionDeliverySubmitted(
  supabase: SupabaseClient,
  input: { clientId: string; projectId: string; milestoneId: string; milestoneTitle: string; attemptNo: number }
) {
  return notifyUsers(supabase, [
    {
      userId: input.clientId,
      type: "milestone_revision_submitted",
      title: "Revizyon teslim edildi",
      message: `"${input.milestoneTitle}" aşaması için revizyon teslim edildi.`,
      link: CLIENT_PROJECT_LINK(input.projectId),
      dedupeKey: `milestone_revision_submitted:${input.milestoneId}:${input.attemptNo}`,
    },
  ]);
}

export function notifyRevisionRequested(
  supabase: SupabaseClient,
  input: { freelancerIds: string[]; projectId: string; milestoneId: string; milestoneTitle: string; revisionNo: number }
) {
  return notifyUsers(
    supabase,
    input.freelancerIds.map((freelancerId) => ({
      userId: freelancerId,
      type: "milestone_revision",
      title: "Revizyon istendi",
      message: `"${input.milestoneTitle}" aşaması için revizyon istendi.`,
      link: FREELANCER_PROJECT_LINK(input.projectId),
      dedupeKey: `milestone_revision:${input.milestoneId}:${input.revisionNo}:${freelancerId}`,
    }))
  );
}

export function notifyDeliveryApproved(
  supabase: SupabaseClient,
  input: { freelancerIds: string[]; projectId: string; milestoneId: string; milestoneTitle: string }
) {
  return notifyUsers(
    supabase,
    input.freelancerIds.map((freelancerId) => ({
      userId: freelancerId,
      type: "milestone_approved",
      title: "Aşama onaylandı",
      message: `"${input.milestoneTitle}" aşaması onaylandı.`,
      link: FREELANCER_PROJECT_LINK(input.projectId),
      dedupeKey: `milestone_approved:${input.milestoneId}:${freelancerId}`,
    }))
  );
}

export function notifyProjectCompleted(
  supabase: SupabaseClient,
  input: { freelancerIds: string[]; projectId: string; projectTitle: string }
) {
  return notifyUsers(
    supabase,
    input.freelancerIds.map((freelancerId) => ({
      userId: freelancerId,
      type: "project_completed",
      title: "Proje tamamlandı",
      message: `"${input.projectTitle}" projesi tamamlandı. Şimdi değerlendirme yapabilirsin.`,
      link: FREELANCER_PROJECT_LINK(input.projectId),
      dedupeKey: `project_completed:${input.projectId}:${freelancerId}`,
    }))
  );
}

export function notifyFreelancerInvited(
  supabase: SupabaseClient,
  input: { freelancerId: string; invitationId: string; projectTitle: string }
) {
  return notifyUsers(supabase, [
    {
      userId: input.freelancerId,
      type: "invitation_received",
      title: "Bir projeye davet edildin",
      message: `"${input.projectTitle}" projesine davet edildin.`,
      link: "/freelancers/proposals",
      dedupeKey: `invitation_received:${input.invitationId}`,
    },
  ]);
}
