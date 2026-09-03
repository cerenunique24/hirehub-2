import type { ProjectBrief, ProjectAnalysis } from "@/types/ai";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Web Development": ["website", "web app", "next.js", "react", "frontend", "backend"],
  "Mobile App": ["mobile", "ios", "android", "app"],
  "Brand & Design": ["brand", "logo", "identity", "design", "ui", "ux"],
  "Marketing": ["marketing", "campaign", "social media", "ads"],
  "E-Commerce": ["e-commerce", "shop", "store", "marketplace"],
};

const DEFAULT_SKILLS = ["Project Management", "Communication", "Quality Assurance"];

function detectCategory(text: string): string {
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }

  return "General Project";
}

function detectComplexity(description: string, budget: string): ProjectAnalysis["complexity"] {
  const length = description.length;
  const isHighBudget = budget.includes("100,000") || budget.includes("25,000 - 100,000");

  if (length > 400 || isHighBudget) return "High";
  if (length > 150) return "Medium";
  return "Low";
}

function extractGoals(description: string): string[] {
  const sentences = description
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) {
    return ["Define clear project objectives", "Deliver value to target audience"];
  }

  return sentences.slice(0, 3).map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function buildSkills(category: string, description: string): string[] {
  const lower = description.toLowerCase();
  const skills = new Set<string>(DEFAULT_SKILLS);

  if (category.includes("Web") || lower.includes("web")) {
    skills.add("Next.js");
    skills.add("React");
    skills.add("TypeScript");
  }

  if (category.includes("Design") || lower.includes("design")) {
    skills.add("UI Design");
    skills.add("UX Research");
    skills.add("Figma");
  }

  if (category.includes("Mobile")) {
    skills.add("React Native");
    skills.add("Mobile UI");
  }

  if (category.includes("Marketing")) {
    skills.add("Content Strategy");
    skills.add("Analytics");
  }

  if (category.includes("E-Commerce")) {
    skills.add("Payment Integration");
    skills.add("Product Catalog");
  }

  return Array.from(skills).slice(0, 8);
}

function buildRoles(skills: string[]): string[] {
  const roles = ["Project Lead"];

  if (skills.some((s) => s.includes("Design") || s.includes("Figma"))) {
    roles.push("UI/UX Designer");
  }

  if (skills.some((s) => ["Next.js", "React", "TypeScript"].includes(s))) {
    roles.push("Frontend Developer");
  }

  if (skills.some((s) => s.includes("Backend") || s.includes("Node"))) {
    roles.push("Backend Developer");
  }

  if (roles.length < 3) {
    roles.push("Specialist");
  }

  return roles.slice(0, 5);
}

function buildDeliverables(category: string): string[] {
  const base = ["Project documentation", "Final handoff package"];

  if (category.includes("Web")) {
    return [...base, "Responsive web application", "Deployment setup"];
  }

  if (category.includes("Design")) {
    return [...base, "Design system", "High-fidelity mockups", "Prototype"];
  }

  if (category.includes("Mobile")) {
    return [...base, "Mobile app build", "App store assets"];
  }

  return [...base, "Core deliverables", "Review sessions"];
}

function estimateTimeline(deadline: string, complexity: ProjectAnalysis["complexity"]): string {
  if (deadline.includes("1 week")) return "1-2 weeks";
  if (deadline.includes("1 month")) return complexity === "High" ? "6-8 weeks" : "3-4 weeks";
  if (deadline.includes("3 months")) return "8-12 weeks";
  return complexity === "High" ? "8-10 weeks" : "4-6 weeks";
}

function estimateTeamSize(complexity: ProjectAnalysis["complexity"]): number {
  if (complexity === "High") return 4;
  if (complexity === "Medium") return 3;
  return 2;
}

export async function analyzeProject(brief: ProjectBrief): Promise<ProjectAnalysis> {
  await delay(1200);

  const category = detectCategory(brief.description);
  const complexity = detectComplexity(brief.description, brief.budget);
  const skills = buildSkills(category, brief.description);
  const roles = buildRoles(skills);
  const goals = extractGoals(brief.description);
  const teamSize = estimateTeamSize(complexity);

  return {
    summary: brief.title
      ? `${brief.title} is a ${category.toLowerCase()} initiative focused on delivering structured outcomes within the client's timeline and budget.`
      : `A ${category.toLowerCase()} project requiring coordinated expertise across ${roles.length} key roles.`,
    category,
    complexity,
    goals,
    keyRequirements: [
      brief.description.slice(0, 120) + (brief.description.length > 120 ? "..." : ""),
      "Clear milestones and review checkpoints",
      "Quality standards aligned with project goals",
    ],
    requiredExpertise: skills.slice(0, 5),
    requiredRoles: roles,
    requiredSkills: skills,
    deliverables: buildDeliverables(category),
    estimatedTimeline: estimateTimeline(brief.deadline, complexity),
    estimatedBudget: brief.budget || "To be confirmed",
    recommendedTeamSize: teamSize,
    insights: `Based on your brief, CollaCrew recommends a ${complexity.toLowerCase()}-complexity approach with a crew of ${teamSize}. ${category} projects benefit from early alignment on scope and staged deliverables.`,
    recommendations: [
      "Start with a discovery phase to validate requirements",
      "Assign a project lead for client communication",
      teamSize > 2 ? "Consider a coalition for faster delivery" : "A focused specialist team may be sufficient",
    ],
    considerations: [
      "Scope changes may affect timeline and budget",
      "Early stakeholder feedback reduces revision cycles",
      complexity === "High" ? "Complex projects benefit from phased milestones" : "Keep deliverables focused for faster launch",
    ],
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
