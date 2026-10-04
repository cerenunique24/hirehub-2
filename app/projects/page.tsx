import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth/session";

/**
 * Bu route kullanıcıya gösterilen bir sayfa değil: eskiden boş, İngilizce bir
 * yer tutucuydu. Gerçek proje listeleri rol bazlı panellerde yaşıyor; kullanıcı
 * rolüne göre oraya yönlendirilir (oturum yoksa /login).
 */
export default async function ProjectsRedirect() {
  const { role } = await requireSession();
  redirect(role === "freelancer" ? "/freelancers/projects" : "/client/projects");
}
