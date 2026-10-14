import { pageHeaderClass } from "@/components/ui/PageHeader";
import AccountSettings from "@/components/settings/AccountSettings";

export default function ClientSettingsPage() {
  return (
    <div className="w-full">
      <div className={pageHeaderClass}>
        <h1 className="cc-page-title font-semibold text-[var(--color-text-primary)]">Ayarlar</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Hesabın üzerindeki kontrol merkezin.</p>
      </div>
      <AccountSettings profileHref="/client/profile" />
    </div>
  );
}
