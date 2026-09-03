export default function ClientSettingsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-2 text-neutral-500">
          Manage your client account, notifications, and preferences.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="font-semibold text-neutral-900">Account type</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Individual and company accounts share the same client experience.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-neutral-900">Notifications</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Email and in-app notification preferences.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
