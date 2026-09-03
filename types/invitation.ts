export type InvitationReceiver =
  | "freelancer"
  | "coalition";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "declined";

export interface Invitation {
  id: string;

  projectId: string;

  receiverType: InvitationReceiver;

  receiverId: string;

  message?: string;

  status: InvitationStatus;

  createdAt: Date;
}