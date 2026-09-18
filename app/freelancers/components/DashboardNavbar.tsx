"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  MessageCircle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/relativeTime";

type Message = {
  id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_id: string;
};

type Notification = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type Profile = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export default function DashboardNavbar() {
  const [name, setName] = useState("Freelancer");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchMessages = async (userId: string) => {
    setLoadingMessages(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, content, is_read, created_at, sender_id"
        )
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Mesajlar yüklenirken hata:", error);
        setMessages([]);
        return;
      }

      setMessages(data ?? []);
    } catch (error) {
      console.error("Mesajlar yüklenirken beklenmeyen hata:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchNotifications = async (userId: string) => {
    setLoadingNotifications(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, title, message, link, is_read, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error(
          "Bildirimler yüklenirken hata:",
          error
        );
        setNotifications([]);
        return;
      }

      setNotifications(data ?? []);
    } catch (error) {
      console.error(
        "Bildirimler yüklenirken beklenmeyen hata:",
        error
      );
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchUser = async () => {
    try {
      const supabase = createClient();

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(
          "Kullanıcı alınırken hata:",
          authError
        );
        return;
      }

      const user = authData.user;

      if (!user) {
        return;
      }

      /*
       * Profil sorgusunda .single() kullanmıyoruz.
       *
       * Böylece profiles tablosunda profil satırı bulunmasa bile
       * navbar tamamen hata vermez.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (profileError) {
        console.error(
          "Profil yüklenirken hata:",
          profileError
        );
      }

      const metadata = user.user_metadata as
        | {
            first_name?: string;
            name?: string;
            full_name?: string;
          }
        | undefined;

      const profileName = [
        profile?.first_name,
        profile?.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      const fallbackName =
        profileName ||
        metadata?.first_name ||
        metadata?.name ||
        metadata?.full_name ||
        "Freelancer";

      setName(fallbackName);

      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      } else {
        setAvatarUrl(null);
      }

      await Promise.all([
        fetchMessages(user.id),
        fetchNotifications(user.id),
      ]);
    } catch (error) {
      console.error(
        "Profil yüklenirken beklenmeyen hata:",
        error
      );
    }
  };

  useEffect(() => {
    void fetchUser();
  }, []);

  const unreadMessages = messages.filter(
    (message) => !message.is_read
  ).length;

  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const toggleMessages = () => {
    setShowMessages((prev) => !prev);
    setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    setShowMessages(false);
  };

  const markNotificationAsRead = async (
    notificationId: string
  ) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (error) {
      console.error(
        "Bildirim güncellenirken hata:",
        error
      );
      return;
    }

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

  const markAllNotificationsAsRead = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return;

    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <header className="relative flex h-20 items-center justify-between border-b border-gray-100 bg-white px-5 sm:px-8">
      {/* Arama */}
      <div className="flex w-[350px] items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
        <Search
          size={18}
          className="text-gray-400"
        />

        <input
          type="text"
          placeholder="Ara..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {/* Sağ Alan */}
      <div className="flex items-center gap-4">
        {/* Mesajlar */}
        <button
          type="button"
          onClick={toggleMessages}
          className="relative rounded-xl border border-gray-100 bg-white p-3 transition hover:bg-gray-50"
          aria-label="Mesajlar"
        >
          <MessageCircle size={20} />

          {unreadMessages > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold text-white">
              {unreadMessages}
            </span>
          )}
        </button>

        {/* Bildirimler */}
        <button
          type="button"
          onClick={toggleNotifications}
          className="relative rounded-xl border border-gray-100 bg-white p-3 transition hover:bg-gray-50"
          aria-label="Bildirimler"
        >
          <Bell size={20} />

          {unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadNotifications}
            </span>
          )}
        </button>

        {/* Profil */}
        <Link
          href="/freelancers/profile"
          className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2 transition hover:bg-gray-50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-sm font-semibold text-white">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">
              {name}
            </p>

            <p className="text-xs text-gray-500">
              Freelancer
            </p>
          </div>
        </Link>
      </div>

      {/* Mesajlar Dropdown */}
      {showMessages && (
        <div className="absolute right-[170px] top-14 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Mesajlar
              </h3>

              <p className="text-xs text-gray-500">
                Son mesajların
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowMessages(false)
              }
              aria-label="Mesajları kapat"
            >
              <X
                size={17}
                className="text-gray-400"
              />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingMessages ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                Yükleniyor...
              </div>
            ) : messages.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                Henüz mesajın yok.
              </div>
            ) : (
              messages.map((message) => (
                <Link
                  key={message.id}
                  href="/freelancers/messages"
                  onClick={() =>
                    setShowMessages(false)
                  }
                  className="block border-b border-gray-50 px-5 py-4 transition hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold">
                      M
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          Mesaj
                        </p>

                        {!message.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-black" />
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs text-gray-500">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/freelancers/messages"
            onClick={() =>
              setShowMessages(false)
            }
            className="block border-t border-gray-100 px-5 py-3 text-center text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Tüm mesajları gör
          </Link>
        </div>
      )}

      {/* Bildirimler Dropdown */}
      {showNotifications && (
        <div className="absolute right-[110px] top-14 z-50 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Bildirimler
              </h3>

              <p className="text-xs text-gray-500">
                Son bildirimlerin
              </p>
            </div>

            <div className="flex items-center gap-2">
              {notifications.some((n) => !n.is_read) && (
                <button
                  type="button"
                  onClick={() => void markAllNotificationsAsRead()}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900"
                >
                  Tümünü okundu işaretle
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  setShowNotifications(false)
                }
                aria-label="Bildirimleri kapat"
              >
                <X
                  size={17}
                  className="text-gray-400"
                />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingNotifications ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                Yükleniyor...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                Henüz bildirimin yok.
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
                    void markNotificationAsRead(
                      notification.id
                    );
                    setShowNotifications(false);
                  }}
                  className={`block border-b border-gray-50 px-5 py-4 transition hover:bg-gray-50 ${
                    !notification.is_read
                      ? "bg-gray-50/70"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
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
                        <p className="mt-1 text-xs text-gray-500">
                          {notification.message}
                        </p>
                      )}

                      <p className="mt-2 text-[10px] text-gray-400">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/freelancers/notifications"
            onClick={() =>
              setShowNotifications(false)
            }
            className="block border-t border-gray-100 px-5 py-3 text-center text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Tüm bildirimleri gör
          </Link>
        </div>
      )}
    </header>
  );
}