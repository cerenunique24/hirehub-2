import { User } from "@/types";

export const users: User[] = [
  {
    id: "u1",
    name: "Ahmet",
    surname: "Yılmaz",
    username: "ahmetylmz",
    email: "ahmet@example.com",
    avatar: "/avatars/1.png",
    role: "freelancer",
    status: "active",
    country: "Türkiye",
    city: "İstanbul",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "u2",
    name: "Zeynep",
    surname: "Demir",
    username: "zeynepdmr",
    email: "zeynep@example.com",
    avatar: "/avatars/2.png",
    role: "freelancer",
    status: "active",
    country: "Türkiye",
    city: "İzmir",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];