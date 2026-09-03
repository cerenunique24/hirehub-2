export const PROJECT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PROJECT_LIFECYCLE = {
  DRAFT: "draft",
  ANALYZING: "analyzing",
  ANALYZED: "analyzed",
  REVIEWING: "reviewing",
  MATCHING: "matching",
  CREW_REVIEW: "crew_review",
  READY_TO_PUBLISH: "ready_to_publish",
  PUBLISHED: "published",
} as const;

export type ProjectLifecycleStage =
  (typeof PROJECT_LIFECYCLE)[keyof typeof PROJECT_LIFECYCLE];
