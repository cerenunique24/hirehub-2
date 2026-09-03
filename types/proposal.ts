export type ProposalSender = "freelancer" | "coalition";

export type ProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface Proposal {
  id: string;

  projectId: string;

  senderType: ProposalSender;

  senderId: string;

  coverLetter: string;

  budget: number;

  duration: number;

  status: ProposalStatus;

  createdAt: Date;
}