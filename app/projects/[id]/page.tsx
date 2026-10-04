import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";

/** Eski yer tutucu route; gerçek proje detayı rol bazlı panellerde. */
export default async function ProjectDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireSession();
  redirect(role === "freelancer" ? `/freelancers/projects/${id}` : `/client/projects/${id}`);
}
