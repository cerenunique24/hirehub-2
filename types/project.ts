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

export type BudgetVisibility = "visible" | "hidden";

/**
 * The persisted JSONB shape for `projects.budget_breakdown`.
 * Client budget is deliberately distinct from the AI recommendation.
 */
export interface ProjectBudgetRole {
  id: string;
  role_name: string;
  quantity: number;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  delivery_formats: string[];
  delivery_description: string;
  duration: string;
  ai_budget_min: number | null;
  ai_budget_max: number | null;
  client_budget: number | null;
  budget_visibility: BudgetVisibility;
}
