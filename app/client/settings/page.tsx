import AccountSettings from "@/components/settings/AccountSettings";

export default function ClientSettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-neutral-900">Ayarlar</h1>
        <p className="mt-2 text-neutral-500">Hesabın üzerindeki kontrol merkezin.</p>
      </div>
      <AccountSettings profileHref="/client/profile" />
    </div>
  );
}
