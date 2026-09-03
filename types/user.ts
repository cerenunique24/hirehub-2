export type UserRole = "client" | "freelancer";

export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: string;
  name: string;
  surname: string;
  username: string;
  email: string;

  avatar?: string;
  bio?: string;

  role: UserRole;
  status: UserStatus;

  country?: string;
  city?: string;

  createdAt: Date;
  updatedAt: Date;
}