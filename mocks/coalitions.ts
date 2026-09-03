import { Coalition } from "@/types";

export const coalitions: Coalition[] = [
  {
    id: "co1",

    name: "Nova Studio",

    ownerId: "u1",

    members: [
      {
        userId: "u1",
        role: "Frontend",
        isLeader: true,
      },
      {
        userId: "u2",
        role: "UI Designer",
        isLeader: false,
      },
    ],

    skills: [
      "Next.js",
      "React",
      "UI Design",
      "Node.js",
    ],

    aiScore: 97,

    completedProjects: 31,

    rating: 4.9,

    availability: "available",

    createdAt: new Date(),
  },
];