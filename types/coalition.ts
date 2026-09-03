export interface CoalitionMember {
  userId: string;
  role: string;
  isLeader: boolean;
}

export interface Coalition {
  id: string;

  name: string;

  ownerId: string;

  members: CoalitionMember[];

  skills: string[];

  aiScore: number;

  completedProjects: number;

  rating: number;

  availability: "available" | "busy";

  createdAt: Date;
}