import { Proposal } from "@/types";

export const proposals: Proposal[] = [
  {
    id: "pr1",

    projectId: "p1",

    senderType: "coalition",

    senderId: "co1",

    coverLetter:
      "We have successfully completed multiple AI SaaS products and would love to collaborate.",

    budget: 320000,

    duration: 45,

    status: "pending",

    createdAt: new Date(),
  },
];