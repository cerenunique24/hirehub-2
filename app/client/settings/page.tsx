import AccountSettings from "@/components/settings/AccountSettings";
import styles from "@/components/settings/ClientSettings.module.css";

export default function ClientSettingsPage() {
  return <main className={styles.page}>
    <header className={styles.pageHeader}>
      <h1>Ayarlar</h1>
      <p>Hesap ve uygulama tercihlerinizi yönetin.</p>
    </header>
    <AccountSettings profileHref="/client/profile" presentation="client"/>
  </main>;
}
