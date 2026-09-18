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
  title: string;
  description: string | null;
  due_date: string | null;
  budget: number | null;
  sort_order: number;
  status: MilestoneStatus;
  deliverable_description: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  revision_notes: string | null;
  created_at: string;
  updated_at: string;
};

const MILESTONE_COLUMNS =
  "id, project_id, title, description, due_date, budget, sort_order, status, deliverable_description, submitted_at, approved_at, revision_notes, created_at, updated_at";

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
  }
) {
  return supabase
    .from("project_milestones")
    .insert({
      project_id: input.projectId,
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

export { notifyUsers } from "@/lib/notifications";
