export type ProjectLifecycleStage =
  | "draft"
  | "analyzing"
  | "analyzed"
  | "reviewing"
  | "matching"
  | "crew_review"
  | "ready_to_publish"
  | "published";

export interface ProjectBrief {
  title: string;
  description: string;
  goals?: string;
  context?: string;
  requirements?: string;
  budget: string;
  deadline: string;
}

export interface ProjectAnalysis {
  summary: string;
  category: string;
  complexity: "Low" | "Medium" | "High";
  goals: string[];
  keyRequirements: string[];
  requiredExpertise: string[];
  requiredRoles: string[];
  requiredSkills: string[];
  deliverables: string[];
  estimatedTimeline: string;
  estimatedBudget: string;
  recommendedTeamSize: number;
  insights: string;
  recommendations: string[];
  considerations: string[];
}

export interface TalentMatchFreelancer {
  userId: string;
  name: string;
  username: string;
  avatar?: string;
  skills: string[];
  matchScore: number;
  reasons: string[];
  hourlyRate?: string;
}

export interface TalentMatchCoalition {
  coalitionId: string;
  name: string;
  skills: string[];
  matchScore: number;
  reasons: string[];
  memberCount: number;
  rating: number;
}

export interface TalentMatchingResult {
  recommendedFreelancers: TalentMatchFreelancer[];
  recommendedCoalitions: TalentMatchCoalition[];
}

export interface CrewMemberRecommendation {
  role: string;
  userId?: string;
  name: string;
  skills: string[];
  reason: string;
}

export interface CrewRecommendation {
  members: CrewMemberRecommendation[];
  totalEstimatedCost: string;
  estimatedDuration: string;
  summary: string;
  confidence: number;
}

export interface ProfileAnalysis {
  strength: number;
  missingFields: string[];
  skillInsights: string[];
  suggestions: string[];
}

export interface ProjectRecommendation {
  projectId: string;
  title: string;
  matchScore: number;
  reasons: string[];
  relevantSkills: string[];
  budget: number;
}

export interface ProposalImprovement {
  suggestions: string[];
  improvedCoverLetter: string;
  strengths: string[];
  weaknesses: string[];
}

export interface AIRecommendation {
  projectId: string;
  recommendation: "single" | "coalition";
  confidence: number;
  suggestedRoles: string[];
  suggestedSkills: string[];
  estimatedBudget: number;
  estimatedDuration: number;
  summary: string;
}

export interface CollaCrewProjectState {
  stage: ProjectLifecycleStage;
  brief: ProjectBrief;
  aiAnalysis?: ProjectAnalysis;
  userAnalysis?: ProjectAnalysis;
  talentMatching?: TalentMatchingResult;
  crewRecommendation?: CrewRecommendation;
  approvedCrew?: CrewMemberRecommendation[];
}
