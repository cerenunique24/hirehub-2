import { requireSession } from "@/lib/auth/session";

/** Panelin server layout'u; public freelancer profilleri bu segmentin dışında kalır. */
export default async function FreelancerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession("freelancer");
  return children;
}
