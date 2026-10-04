import type { SupabaseClient } from "@supabase/supabase-js";

export type MilestoneStatus =
  | "pending"
  | "active"
  | "submitted"
  | "in_review"
  | "revision"
  | "approved";

export type Milestone = {
  id: string;
  project_id: string;
  /**
   * NULL = proje geneli aşama (tek freelancer projeleri, mevcut davranış).
   * Dolu ise bu aşama yalnızca o freelancer'ın rolüne aittir (team project).
   */
  freelancer_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  budget: number | null;
  sort_order: number;
  status: MilestoneStatus;
  deliverable_description: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  reviewed_at: string | null;
  revision_requested_at: string | null;
  revision_count: number;
  revision_notes: string | null;
  payment_status: string | null;
  dispute_status: string | null;
  platform_fee_amount: number | null;
  freelancer_payout_amount: number | null;
  client_total_amount: number | null;
  created_at: string;
  updated_at: string;
};

const MILESTONE_COLUMNS =
  "id, project_id, freelancer_id, title, description, due_date, budget, sort_order, status, deliverable_description, submitted_at, approved_at, reviewed_at, revision_requested_at, revision_count, revision_notes, payment_status, dispute_status, platform_fee_amount, freelancer_payout_amount, client_total_amount, created_at, updated_at";

export type MilestoneEventType = "submitted" | "revision_requested" | "resubmitted" | "approved";

export type MilestoneEvent = {
  id: string;
  milestone_id: string;
  actor_id: string;
  actor_role: "client" | "freelancer";
  event_type: MilestoneEventType;
  note: string | null;
  created_at: string;
};

export async function fetchMilestones(supabase: SupabaseClient, projectId: string) {
  return supabase
    .from("project_milestones")
    .select(MILESTONE_COLUMNS)
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
}

/**
 * Bir projedeki tüm aşamaların teslim/revizyon geçmişini tek seferde getirir.
 * Satırlar `project_milestones_log_event` trigger'ı tarafından otomatik
 * yazılır — app kodu asla doğrudan bu tabloya yazmaz.
 */
export async function fetchMilestoneEvents(supabase: SupabaseClient, milestoneIds: string[]) {
  if (milestoneIds.length === 0) {
    return { data: [] as MilestoneEvent[], error: null };
  }

  return supabase
    .from("project_milestone_events")
    .select("id, milestone_id, actor_id, actor_role, event_type, note, created_at")
    .in("milestone_id", milestoneIds)
    .order("created_at", { ascending: true });
}

export async function createMilestone(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    title: string;
    description?: string | null;
    dueDate?: string | null;
    budget?: number | null;
    sortOrder: number;
    /** İlk aşama doğrudan `active`, sonrakiler `pending` başlar. */
    status?: MilestoneStatus;
    /** Team project'te bu aşamanın ait olduğu freelancer. Tek freelancer projelerinde null bırakılır. */
    freelancerId?: string | null;
  }
) {
  return supabase
    .from("project_milestones")
    .insert({
      project_id: input.projectId,
      freelancer_id: input.freelancerId ?? null,
      title: input.title,
      description: input.description ?? null,
      due_date: input.dueDate ?? null,
      budget: input.budget ?? null,
      sort_order: input.sortOrder,
      status: input.status ?? "pending",
    })
    .select(MILESTONE_COLUMNS)
    .single();
}

export async function deleteMilestone(supabase: SupabaseClient, milestoneId: string) {
  return supabase.from("project_milestones").delete().eq("id", milestoneId);
}

/** Client: bir sonraki bekleyen aşamayı aktif hale getirir. */
export async function activateMilestone(supabase: SupabaseClient, milestoneId: string) {
  return supabase
    .from("project_milestones")
    .update({ status: "active" })
    .eq("id", milestoneId)
    .eq("status", "pending")
    .select(MILESTONE_COLUMNS)
    .single();
}

/** Freelancer: aktif/revizyondaki aşamayı teslim eder. */
export async function submitMilestone(
  supabase: SupabaseClient,
  milestoneId: string,
  fromStatus: "active" | "revision",
  deliverableDescription: string
) {
  return supabase
    .from("project_milestones")
    .update({
      status: fromStatus === "active" ? "submitted" : "in_review",
      deliverable_description: deliverableDescription,
    })
    .eq("id", milestoneId)
    .eq("status", fromStatus)
    .select(MILESTONE_COLUMNS)
    .single();
}

/** Client: teslimi onaylar veya revizyon ister. */
export async function reviewMilestone(
  supabase: SupabaseClient,
  milestoneId: string,
  decision: "approved" | "revision",
  revisionNotes?: string
) {
  return supabase
    .from("project_milestones")
    .update({
      status: decision,
      revision_notes: decision === "revision" ? revisionNotes ?? null : null,
    })
    .eq("id", milestoneId)
    .in("status", ["submitted", "in_review"])
    .select(MILESTONE_COLUMNS)
    .single();
}

export type MilestoneDeliveryStatus = "submitted" | "revision_requested" | "approved";

/**
 * Bir aşamanın her teslim denemesi (ilk teslim + her yeniden teslim). Normal
 * proje dosyalarından (project_files) ayrıdır: yalnızca teslim gönderildiğinde
 * DB trigger'ı tarafından yazılır ve teslimle birlikte yüklenen dosyalar
 * `project_files.delivery_id` ile bu kayda bağlanır.
 */
export type MilestoneDelivery = {
  id: string;
  milestone_id: string;
  project_id: string;
  submitted_by: string;
  attempt_no: number;
  message: string;
  status: MilestoneDeliveryStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_feedback: string | null;
};

export type DeliveryFile = {
  id: string;
  delivery_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
};

export async function fetchMilestoneDeliveries(supabase: SupabaseClient, projectId: string) {
  return supabase
    .from("project_milestone_deliveries")
    .select("id, milestone_id, project_id, submitted_by, attempt_no, message, status, submitted_at, reviewed_at, review_feedback")
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: true });
}

export async function fetchDeliveryFiles(supabase: SupabaseClient, deliveryIds: string[]) {
  if (deliveryIds.length === 0) {
    return { data: [] as DeliveryFile[], error: null };
  }

  return supabase
    .from("project_files")
    .select("id, delivery_id, file_name, file_path, file_size")
    .in("delivery_id", deliveryIds);
}

export {
  notifyUsers,
  notifyDeliverySubmitted,
  notifyRevisionRequested,
  notifyDeliveryApproved,
} from "@/lib/notifications";
