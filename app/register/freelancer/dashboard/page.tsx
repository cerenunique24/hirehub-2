import { redirect } from "next/navigation";

/** Eski sahte panel; gerçek freelancer paneli /freelancers/dashboard altında. */
export default function LegacyFreelancerDashboardRedirect() {
  redirect("/freelancers/dashboard");
}
