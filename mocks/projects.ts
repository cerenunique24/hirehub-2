import { Project } from "@/types";

export const projects: Project[] = [
  {
    id: "p1",
    clientId: "c1",

    title: "AI Supported CRM Platform",

    description:
      "Looking for a coalition to develop a modern CRM platform with AI features.",

    budget: 350000,

    deadline: new Date("2026-12-30"),

    requiredSkills: [
      "UI Design",
      "Next.js",
      "Node.js",
      "AI",
    ],

    recommendation: "coalition",

    status: "published",

    createdAt: new Date(),
  },
];