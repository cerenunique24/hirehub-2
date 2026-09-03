import type { ProposalImprovement } from "@/types/ai";

interface ProposalInput {
  coverLetter: string;
  projectTitle?: string;
  budget?: number;
}

export async function improveProposal(input: ProposalInput): Promise<ProposalImprovement> {
  await delay(500);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (input.coverLetter.length > 100) {
    strengths.push("Good detail in your cover letter");
  } else {
    weaknesses.push("Cover letter is too brief");
    suggestions.push("Expand your cover letter to explain your approach and relevant experience");
  }

  if (input.projectTitle && input.coverLetter.toLowerCase().includes(input.projectTitle.toLowerCase().split(" ")[0])) {
    strengths.push("References the project context");
  } else {
    suggestions.push("Mention the specific project goals to show you've read the brief");
  }

  if (input.budget) {
    suggestions.push(`Justify your budget (₺${input.budget.toLocaleString("tr-TR")}) with deliverables and timeline`);
  }

  suggestions.push("Highlight 1-2 similar projects you've completed");
  suggestions.push("Propose a clear first milestone");

  const improvedCoverLetter = [
    input.coverLetter.trim(),
    "",
    input.projectTitle
      ? `For "${input.projectTitle}", I would start with a discovery session to align on scope, then deliver in structured milestones with regular check-ins.`
      : "I would approach this project with structured milestones and regular client communication.",
  ].join("\n");

  return {
    suggestions,
    improvedCoverLetter,
    strengths,
    weaknesses,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
