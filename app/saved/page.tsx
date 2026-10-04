import { redirect } from "next/navigation";

/**
 * Bu route artık asıl Favorilerim sayfası değil. Freelancer panelinin
 * sidebar/navbar/auth katmanı (app/freelancers/layout.tsx + proxy.ts)
 * yalnızca /freelancers/* altındaki sayfaları sarmalıyor, bu yüzden
 * gerçek Favorilerim ekranı /freelancers/saved'de yaşıyor. Eski/olası
 * dış bağlantıları kırmamak için buradan oraya yönlendiriyoruz.
 */
export default function SavedPageRedirect() {
  redirect("/freelancers/saved");
}
