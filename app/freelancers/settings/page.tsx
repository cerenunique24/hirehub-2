import AccountSettings from "@/components/settings/AccountSettings";
import { PageHeader, pageHeaderClass } from "@/components/ui/PageHeader";
export default function FreelancerSettingsPage(){return <><PageHeader className={pageHeaderClass} title="Ayarlar" description="Hesabın üzerindeki kontrol merkezin."/><AccountSettings profileHref="/freelancers/profile"/></>;}
