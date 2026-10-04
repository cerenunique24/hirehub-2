import { redirect } from "next/navigation";

/**
 * Bu route eskiden sahte (hardcoded, İngilizce) ilan listesi gösteriyordu.
 * CollaCrew'da iş ilanı listesi yoktur: projeler client tarafından
 * oluşturulur ve freelancer keşfinde (/freelancers/discover) eşleşmeye göre gösterilir.
 */
export default function JobsRedirect() {
  redirect("/");
}
