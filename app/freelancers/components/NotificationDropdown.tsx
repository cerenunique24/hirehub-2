"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsDropdown() {
  const supabase = useMemo(() => createClient(), []);

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, title, message, link, is_read, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

      if (!error && active) {
        setNotifications(
          (data ?? []) as Notification[]
        );
      }

      setLoading(false);
    }

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [supabase]);

  /*
   * Yeni bildirimleri gerçek zamanlı dinle
   */
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null =
      null;

    async function subscribeToNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      channel = supabase
        .channel(`freelancer-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notification =
              payload.new as Notification;

            setNotifications((current) => {
              const exists = current.some(
                (item) =>
                  item.id === notification.id
              );

              if (exists) return current;

              return [
                notification,
                ...current,
              ].slice(0, 10);
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notification =
              payload.new as Notification;

            setNotifications((current) =>
              current.map((item) =>
                item.id === notification.id
                  ? notification
                  : item
              )
            );
          }
        )
        .subscribe();

      if (!active && channel) {
        await supabase.removeChannel(channel);
      }
    }

    void subscribeToNotifications();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const markAsRead = async (
    notificationId: string
  ) => {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId);

    if (error) return;

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
            }
          : notification
      )
    );
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(
        (notification) => !notification.is_read
      )
      .map((notification) => notification.id);

    if (!unreadIds.length) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .in("id", unreadIds);

    if (error) return;

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell
            size={17}
            className="text-gray-700"
          />

          <h3 className="text-sm font-semibold text-gray-900">
            Bildirimler
          </h3>
        </div>

        {unreadCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-2 text-[10px] font-semibold text-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </div>

      {/* Bildirimler */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            Bildirimler yükleniyor...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Bell
              size={26}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 text-sm font-medium text-gray-900">
              Henüz bildirimin yok.
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Yeni gelişmeler burada görünecek.
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <Link
              key={notification.id}
              href={
                notification.link ||
                "/freelancers/notifications"
              }
              onClick={() => {
                if (!notification.is_read) {
                  void markAsRead(
                    notification.id
                  );
                }
              }}
              className={`block border-b border-gray-50 px-5 py-4 transition hover:bg-gray-50 ${
                !notification.is_read
                  ? "bg-gray-50"
                  : "bg-white"
              }`}
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <Bell size={14} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </p>

                    {!notification.is_read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    )}
                  </div>

                  {notification.message && (
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {notification.message}
                    </p>
                  )}

                  <p className="mt-2 text-[10px] text-gray-400">
                    {formatTime(
                      notification.created_at
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Alt alan */}
      <div className="flex items-center justify-between border-t border-gray-100">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            <CheckCheck size={14} />
            Tümünü okundu işaretle
          </button>
        )}

        <Link
          href="/freelancers/notifications"
          className="flex flex-1 items-center justify-center px-3 py-3 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
        >
          Tümünü gör →
        </Link>
      </div>
    </div>
  );
}