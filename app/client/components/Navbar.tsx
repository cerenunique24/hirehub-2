"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/relativeTime";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

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

export default function Navbar() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const navbarRef = useRef<HTMLElement>(null);

  /*
   * NAVBAR VERİLERİ
   */
  useEffect(() => {
    let active = true;

    async function loadNavbarData() {
      setLoadingMessages(true);
      setLoadingNotifications(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        setLoadingMessages(false);
        setLoadingNotifications(false);
        return;
      }

      const [
        profileResult,
        messagesResult,
        notificationsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("messages")
          .select(
            "id, content, is_read, created_at, sender_id"
          )
          .eq("receiver_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(5),

        supabase
          .from("notifications")
          .select(
            "id, title, message, link, is_read, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(10),
      ]);

      if (!active) return;

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      if (!messagesResult.error) {
        setMessages(messagesResult.data ?? []);
      }

      if (!notificationsResult.error) {
        setNotifications(
          (notificationsResult.data ?? []) as Notification[]
        );
      }

      setLoadingMessages(false);
      setLoadingNotifications(false);
    }

    void loadNavbarData();

    return () => {
      active = false;
    };
  }, [supabase]);

  /*
   * GERÇEK ZAMANLI BİLDİRİMLER
   */
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribeToNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      channel = supabase
        .channel(`client-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!active) return;

            const newNotification =
              payload.new as Notification;

            setNotifications((current) => {
              const exists = current.some(
                (item) => item.id === newNotification.id
              );

              if (exists) return current;

              return [
                newNotification,
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
            if (!active) return;

            const updatedNotification =
              payload.new as Notification;

            setNotifications((current) =>
              current.map((item) =>
                item.id === updatedNotification.id
                  ? updatedNotification
                  : item
              )
            );
          }
        )
        .subscribe();

    }

    void subscribeToNotifications();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  /*
   * GERÇEK ZAMANLI MESAJLAR
   */
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribeToMessages() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) return;

      channel = supabase
        .channel(`client-navbar-messages-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            if (!active) return;

            const newMessage = payload.new as Message;

            setMessages((current) => {
              const exists = current.some(
                (item) => item.id === newMessage.id
              );

              if (exists) return current;

              return [
                newMessage,
                ...current,
              ].slice(0, 5);
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            if (!active) return;

            const updatedMessage =
              payload.new as Message;

            setMessages((current) =>
              current.map((item) =>
                item.id === updatedMessage.id
                  ? updatedMessage
                  : item
              )
            );
          }
        )
        .subscribe();

    }

    void subscribeToMessages();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase]);

  /*
   * DROPDOWN DIŞINA TIKLANINCA KAPAT
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        navbarRef.current &&
        !navbarRef.current.contains(
          event.target as Node
        )
      ) {
        setShowMessages(false);
        setShowNotifications(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const unreadMessages = messages.filter(
    (message) => !message.is_read
  ).length;

  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const fullName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const displayName =
    fullName || "Proje sahibi";

  const initial =
    displayName.charAt(0).toLocaleUpperCase("tr-TR") ||
    "P";

  const toggleMessages = () => {
    setShowMessages((current) => !current);
    setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications((current) => !current);
    setShowMessages(false);
  };

  const markNotificationAsRead = async (
    notificationId: string
  ) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
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

  const markAllNotificationsAsRead = async () => {
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
    <header
      ref={navbarRef}
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white px-5 sm:px-8"
    >
      {/* Arama */}
      <div className="hidden h-9 w-[320px] items-center gap-2.5 rounded-[var(--radius-input)] border border-gray-100 bg-white px-3 lg:flex">
        <Search
          size={16}
          className="text-gray-400"
        />

        <input
          type="search"
          placeholder="Proje veya freelancer ara..."
          aria-label="Ara"
          className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </div>

      {/* Mobil boşluk */}
      <div className="lg:hidden" />

      {/* Sağ alan */}
      <div className="flex items-center gap-4">

        {/* Mesajlar */}
        <div className="relative">
          <button
            type="button"
            onClick={toggleMessages}
            aria-label="Mesajlar"
            className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] border border-gray-100 bg-white transition hover:bg-gray-50"
          >
            <MessageCircle size={18} />

            {unreadMessages > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary-600)] px-1 text-[10px] font-semibold text-white">
                {unreadMessages > 99
                  ? "99+"
                  : unreadMessages}
              </span>
            )}
          </button>

          {showMessages && (
            <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-[var(--radius-card)] border border-gray-100 bg-white shadow-xl">
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
                  className="rounded-lg p-1 transition hover:bg-gray-100"
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
                    Mesajlar yükleniyor...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500">
                    Henüz mesajın yok.
                  </div>
                ) : (
                  messages.map((message) => (
                    <Link
                      key={message.id}
                      href="/client/messages"
                      onClick={() =>
                        setShowMessages(false)
                      }
                      className="block border-b border-gray-50 px-5 py-4 transition hover:bg-gray-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                          M
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              Yeni mesaj
                            </p>

                            {!message.is_read && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary-600)]" />
                            )}
                          </div>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {message.content}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(
                              message.created_at
                            ).toLocaleString("tr-TR")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <Link
                href="/client/messages"
                onClick={() =>
                  setShowMessages(false)
                }
                className="block border-t border-gray-100 px-5 py-3 text-center text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Tüm mesajları gör →
              </Link>
            </div>
          )}
        </div>

        {/* Bildirimler */}
        <div className="relative">
          <button
            type="button"
            onClick={toggleNotifications}
            aria-label="Bildirimler"
            className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] border border-gray-100 bg-white transition hover:bg-gray-50"
          >
            <Bell size={18} />

            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadNotifications > 99
                  ? "99+"
                  : unreadNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-[var(--radius-card)] border border-gray-100 bg-white shadow-xl">
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
                    className="rounded-lg p-1 transition hover:bg-gray-100"
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
                    Bildirimler yükleniyor...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-500">
                    Henüz bildirimin yok.
                  </div>
                ) : (
                  notifications.map(
                    (notification) => (
                      <Link
                        key={notification.id}
                        href={
                          notification.link ||
                          "/client/notifications"
                        }
                        onClick={() => {
                          if (
                            !notification.is_read
                          ) {
                            void markNotificationAsRead(
                              notification.id
                            );
                          }

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

                            <p className="mt-2 text-xs text-gray-400">
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  )
                )}
              </div>

              <Link
                href="/client/notifications"
                onClick={() =>
                  setShowNotifications(false)
                }
                className="block border-t border-gray-100 px-5 py-3 text-center text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Tüm bildirimleri gör →
              </Link>
            </div>
          )}
        </div>

        {/* Profil */}
        <Link
          href="/client/profile"
          className="hidden h-9 items-center gap-2.5 rounded-[var(--radius-button)] border border-gray-100 bg-white px-2.5 transition hover:bg-gray-50 sm:flex"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary-600)] text-sm font-semibold text-white">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">
              {displayName}
            </p>

            <p className="text-xs text-gray-500">
              Proje sahibi
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}