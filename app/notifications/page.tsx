"use client";

import Link from "next/link";
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

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        setError(`Bildirimler yüklenemedi: ${notificationError.message}`);
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

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (updateError) {
      setError(`Bildirimler güncellenemedi: ${updateError.message}`);
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bildirimler</h1>
          <p className="mt-2 text-sm text-gray-500">Hesabınız ve projelerinizle ilgili güncellemeler.</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <CheckCheck size={16} />
            Tümünü okundu işaretle
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-12 text-sm text-gray-500">
          <Loader2 size={18} className="animate-spin" /> Bildirimler yükleniyor...
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Bell className="mx-auto text-gray-300" size={30} />
          <h2 className="mt-4 font-semibold text-gray-900">Henüz bildiriminiz yok</h2>
          <p className="mt-2 text-sm text-gray-500">Yeni bir sistem olayı oluştuğunda burada görünür.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.link || "/client/notifications"}
              onClick={() => {
                if (!notification.is_read) {
                  void supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
                  setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
                }
              }}
              className={`block rounded-2xl border p-5 transition hover:bg-gray-50 ${notification.is_read ? "border-gray-200 bg-white" : "border-black/20 bg-gray-50"}`}
            >
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100"><Bell size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-medium text-gray-900">{notification.title}</h2>
                    {!notification.is_read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-black" />}
                  </div>
                  {notification.message && <p className="mt-1 text-sm text-gray-600">{notification.message}</p>}
                  <p className="mt-3 text-xs text-gray-400">{new Date(notification.created_at).toLocaleString("tr-TR")}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
