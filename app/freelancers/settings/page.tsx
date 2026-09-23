import AccountSettings from "@/components/settings/AccountSettings";

export default function FreelancerSettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Ayarlar</h1>
        <p className="mt-2 text-sm text-gray-500">Hesabın üzerindeki kontrol merkezin.</p>
      </div>
      <AccountSettings profileHref="/freelancers/profile" />
    </div>
  );
}
