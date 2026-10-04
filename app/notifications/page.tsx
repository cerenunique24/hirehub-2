import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";

/** Bildirimler rol bazlı panellerde yaşıyor; kullanıcı rolüne göre yönlendirilir. */
export default async function NotificationsRedirect() {
  const { role } = await requireSession();
  redirect(role === "freelancer" ? "/freelancers/notifications" : "/client/notifications");
}
