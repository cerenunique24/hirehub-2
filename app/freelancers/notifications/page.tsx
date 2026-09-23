"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

type Filter = "all" | "unread" | "project" | "system";

const supabase = createClient();

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] =
    useState<Filter>("all");

  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, user_id, type, title, message, link, is_read, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Bildirimler yüklenirken hata:",
          error
        );
        setError(
          "Bildirimler yüklenirken bir sorun oluştu."
        );
        setNotifications([]);
      } else {
        setNotifications(
          (data as Notification[]) ?? []
        );
      }

      setLoading(false);
    },
    []
  );

  /*
   * Kullanıcıyı al ve bildirimleri yükle
   */
  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        if (active) {
          setCurrentUserId(null);
          setLoading(false);
        }
        return;
      }

      if (!active) return;

      setCurrentUserId(user.id);
      await loadNotifications(user.id);
    };

    void loadUser();

    return () => {
      active = false;
    };
  }, [loadNotifications]);

  /*
   * Realtime bildirimler
   */
  useEffect(() => {
    if (!currentUserId) return;

    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null =
      null;

    const setupRealtime = async () => {
      const channelName =
        `freelancer-notifications-${currentUserId}`;

      const existingChannels = supabase
        .getChannels()
        .filter(
          (existingChannel) =>
            existingChannel.topic ===
            `realtime:${channelName}`
        );

      await Promise.all(
        existingChannels.map((existingChannel) =>
          supabase.removeChannel(existingChannel)
        )
      );

      if (!active) return;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            const notification =
              payload.new as Notification;

            setNotifications((current) => {
              const exists = current.some(
                (item) => item.id === notification.id
              );

              if (exists) {
                return current;
              }

              return [notification, ...current];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
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
    };

    void setupRealtime();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [currentUserId]);

  /*
   * Tarih formatı
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const isToday =
      date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      date.toDateString() ===
      yesterday.toDateString();

    const time = date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return `Bugün, ${time}`;
    }

    if (isYesterday) {
      return `Dün, ${time}`;
    }

    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /*
   * Bildirim tipini Türkçeleştir
   */
  const getNotificationType = (type: string) => {
    const normalizedType = type.toLowerCase();

    switch (normalizedType) {
      case "project":
      case "proje":
        return "Proje";

      case "team":
      case "ekip":
      case "coalition":
      case "koalisyon":
        return "Ekip";

      case "finance":
      case "finans":
      case "payment":
      case "ödeme":
        return "Finans";

      case "system":
      case "sistem":
        return "Sistem";

      case "message":
      case "mesaj":
        return "Mesaj";

      case "support_reply":
      case "support_status_update":
        return "Destek";

      default:
        return type;
    }
  };

  /*
   * Filtrelenmiş bildirimler
   */
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const type =
        getNotificationType(notification.type);

      if (activeFilter === "unread") {
        return !notification.is_read;
      }

      if (activeFilter === "project") {
        return type === "Proje";
      }

      if (activeFilter === "system") {
        return type === "Sistem";
      }

      return true;
    });
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.is_read
    ).length;
  }, [notifications]);

  /*
   * Bildirimi okundu yap
   */
  const markAsRead = async (
    notification: Notification
  ) => {
    if (notification.is_read) {
      if (notification.link) {
        router.push(notification.link);
      }

      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    );

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notification.id)
      .eq("user_id", currentUserId);

    if (error) {
      console.error(
        "Bildirim okundu olarak işaretlenemedi:",
        error
      );

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: false,
              }
            : item
        )
      );

      return;
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  /*
   * Tüm bildirimleri okundu yap
   */
  const markAllAsRead = async () => {
    if (!currentUserId || unreadCount === 0) {
      return;
    }

    setMarkingAll(true);

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    if (error) {
      console.error(
        "Bildirimler okundu olarak işaretlenemedi:",
        error
      );

      setError(
        "Bildirimler güncellenirken bir sorun oluştu."
      );
    } else {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    }

    setMarkingAll(false);
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "Finans":
        return "bg-green-100 text-green-700";

      case "Ekip":
        return "bg-[var(--color-info-50)] text-[var(--color-info-600)]";

      case "Proje":
        return "bg-blue-100 text-blue-700";

      case "Mesaj":
        return "bg-orange-100 text-orange-700";

      case "Destek":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <main className="w-full p-5 md:p-8">
      <div className="mx-auto w-full max-w-[80rem]">
        {/* Başlık */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Bildirimler
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Projelerin, mesajların ve hesap
              hareketlerinle ilgili bildirimleri takip et.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={markingAll}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-gray-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-medium
                text-gray-700
                transition
                hover:bg-gray-50
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {markingAll ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}

              Tümünü okundu olarak işaretle
            </button>
          )}
        </div>

        {/* Filtreler */}
        <div className="mb-8 flex gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`
              shrink-0
              rounded-lg
              px-5
              py-2
              text-sm
              transition
              ${
                activeFilter === "all"
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            Tümü ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={`
              shrink-0
              rounded-lg
              px-5
              py-2
              text-sm
              transition
              ${
                activeFilter === "unread"
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            Okunmamış ({unreadCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("project")}
            className={`
              shrink-0
              rounded-lg
              px-5
              py-2
              text-sm
              transition
              ${
                activeFilter === "project"
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            Proje
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("system")}
            className={`
              shrink-0
              rounded-lg
              px-5
              py-2
              text-sm
              transition
              ${
                activeFilter === "system"
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            Sistem
          </button>
        </div>

        {/* Hata */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Bildirimler yükleniyor...
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Boş durum */
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              {activeFilter === "unread" ? (
                <Check className="h-5 w-5 text-gray-500" />
              ) : (
                <Bell className="h-5 w-5 text-gray-500" />
              )}
            </div>

            <h2 className="text-base font-semibold text-gray-900">
              {activeFilter === "unread"
                ? "Okunmamış bildirimin yok"
                : "Henüz bildirimin yok"}
            </h2>

            <p className="mt-2 max-w-md text-sm text-gray-500">
              {activeFilter === "unread"
                ? "Tüm bildirimlerini okudun. Yeni bir bildirim geldiğinde burada görünecek."
                : "Projelerin, tekliflerin ve hesap hareketlerinle ilgili bildirimler burada görünecek."}
            </p>
          </div>
        ) : (
          /* Bildirim Listesi */
          <div className="w-full space-y-5">
            {filteredNotifications.map(
              (notification) => {
                const type = getNotificationType(
                  notification.type
                );

                return (
                  <div
                    key={notification.id}
                    className={`
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-6
                      rounded-2xl
                      border
                      bg-white
                      p-6
                      transition
                      ${
                        notification.is_read
                          ? "border-gray-200"
                          : "border-[var(--color-primary-600)]/20"
                      }
                    `}
                  >
                    {/* Sol Alan */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">
                          {notification.title}
                        </h2>

                        <span
                          className={`
                            rounded-full
                            px-3
                            py-1
                            text-xs
                            ${getTypeBadgeClass(type)}
                          `}
                        >
                          {type}
                        </span>

                        {!notification.is_read && (
                          <span
                            className="
                              h-2
                              w-2
                              rounded-full
                              bg-[var(--color-primary-600)]
                            "
                            aria-label="Okunmamış"
                          />
                        )}
                      </div>

                      {notification.message && (
                        <p className="mb-4 text-sm leading-6 text-gray-500">
                          {notification.message}
                        </p>
                      )}

                      <span className="text-xs text-gray-400">
                        {formatDate(
                          notification.created_at
                        )}
                      </span>
                    </div>

                    {/* Aksiyon */}
                    <button
                      type="button"
                      onClick={() =>
                        void markAsRead(notification)
                      }
                      className="
                        shrink-0
                        rounded-xl
                        bg-gray-100
                        px-5
                        py-2.5
                        text-sm
                        font-medium
                        text-gray-700
                        transition
                        hover:bg-gray-200
                      "
                    >
                      Görüntüle
                    </button>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}