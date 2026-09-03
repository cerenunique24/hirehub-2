import { Invitation } from "@/types";

export const invitations: Invitation[] = [
  {
    id: "i1",

    projectId: "p1",

    receiverType: "coalition",

    receiverId: "co1",

    message:
      "We believe your coalition is a perfect fit for this project.",

    status: "pending",

    createdAt: new Date(),
  },
];