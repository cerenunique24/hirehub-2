import { resolveProjectWorkflowState, type WorkflowMilestone } from "./workflow-state";
import { getDeadlineStatus } from "@/lib/utils/deadline";

export type DashboardMilestone = WorkflowMilestone & {
  project_id: string;
  due_date: string | null;
  sort_order: number | null;
  budget?: number | string | null;
  approved_at?: string | null;
};

export function projectWork(input: {
  status: string | null; teamRequired: boolean; milestones: DashboardMilestone[];
  memberIds: string[]; viewer: "client" | "freelancer"; userId: string;
}) {
  const milestones = [...input.milestones].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const own = input.viewer === "freelancer" && input.teamRequired
    ? milestones.filter(m => m.freelancer_id === input.userId) : milestones;
  const workflow = resolveProjectWorkflowState({
    projectStatus: input.status, viewerRole: input.viewer, isTeamProject: input.teamRequired,
    milestones, currentUserId: input.userId, teamMemberIds: input.memberIds,
  });
  const current = input.viewer === "client"
    ? own.find(m => m.status === "submitted" || m.status === "in_review") ?? own.find(m => m.status !== "approved") ?? null
    : own.find(m => ["active", "revision", "pending"].includes(m.status)) ?? own.find(m => m.status !== "approved") ?? null;
  return {
    workflow, currentMilestone: current,
    approvedMilestones: own.filter(m => m.status === "approved").length,
    totalMilestones: own.length,
    overdueMilestones: own.filter(m => getDeadlineStatus({ dueDate: m.due_date, status: m.status }) === "overdue"),
  };
}

export function knownAmount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
