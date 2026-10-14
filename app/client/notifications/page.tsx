"use client";

import { pageHeaderClass } from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import { NotificationRows } from "@/components/notifications/NotificationRows";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export default function ClientNotificationsPage() {
  const router=useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Bildirimleri görmek için giriş yapmalısınız.");
        setLoading(false);
        return;
      }

      const { data, error: notificationError } = await supabase
        .from("notifications")
        .select("id, title, message, link, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (notificationError) {
        console.error("Bildirimler yüklenemedi:", notificationError);
        setError("Bildirimler yüklenemedi. Lütfen tekrar deneyin.");
      } else {
        setNotifications((data ?? []) as Notification[]);
      }
      setLoading(false);
    }
    void loadNotifications();
  }, [supabase]);

  async function markAllAsRead() {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!unreadIds.length) return;
    const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    if (updateError) {
      console.error("Bildirimler güncellenemedi:", updateError);
      setError("Bildirimler güncellenemedi. Lütfen tekrar deneyin.");
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <main className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className={pageHeaderClass}>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Bildirimler</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Projeleriniz ve hesabınızla ilgili güncellemeler.</p>
        </div>
        {unreadCount > 0 && <button type="button" onClick={() => void markAllAsRead()} className="inline-flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"><CheckCheck size={16} />Tümünü okundu işaretle</button>}
      </div>

      {loading ? <div className="mt-8 flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-12 text-sm text-[var(--color-text-secondary)]"><Loader2 size={18} className="animate-spin" />Bildirimler yükleniyor...</div>
        : error ? <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-error-600)]/20 bg-[var(--color-error-50)] p-5 text-sm text-[var(--color-error-600)]">{error}</div>
          : notifications.length === 0 ? <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-12 text-center"><Bell className="mx-auto text-gray-300" size={30} /><h2 className="mt-4 font-semibold text-[var(--color-text-primary)]">Henüz bildiriminiz yok</h2><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Yeni bir sistem olayı oluştuğunda burada görünür.</p></div>
            : <NotificationRows notifications={notifications} getType={()=>""} formatDate={date=>new Date(date).toLocaleString("tr-TR")} onOpen={notification=>{if(!notification.is_read){void supabase.from("notifications").update({is_read:true}).eq("id",notification.id);setNotifications(current=>current.map(item=>item.id===notification.id?{...item,is_read:true}:item));}if(notification.link)router.push(notification.link);}} />}
    </main>
  );
}
