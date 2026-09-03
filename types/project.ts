export type ProjectStatus =
  | "draft"
  | "published"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RecommendationType = "single" | "coalition";

export interface Project {
  id: string;

  clientId: string;

  title: string;
  description: string;

  budget: number;

  deadline: Date;

  requiredSkills: string[];

  recommendation: RecommendationType;

  status: ProjectStatus;

  createdAt: Date;
}