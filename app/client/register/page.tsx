import { redirect } from "next/navigation";

/** Eski yer tutucu; gerçek client kaydı /register/client altında. */
export default function ClientRegisterRedirect() {
  redirect("/register/client");
}
