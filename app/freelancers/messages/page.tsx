"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Search, MessageCircle } from "lucide-react";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type Conversation = {
  user: Profile;
  messages: Message[];
  lastMessage: Message;
  unread: number;
};

export default function MessagesPage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState("müşteri");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  /*
   * ---------------------------------------------------------
   * CURRENT USER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
    };

    getCurrentUser();
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD MESSAGES
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!currentUserId) return;

    const loadMessages = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Mesajlar yüklenemedi:", error);
        setLoading(false);
        return;
      }

      const loadedMessages = (data || []) as Message[];

      setMessages(loadedMessages);

      /*
       * Mesajlarda bulunan diğer kullanıcıların ID'lerini buluyoruz.
       */

      const otherUserIds = Array.from(
        new Set(
          loadedMessages
            .map((message) =>
              message.sender_id === currentUserId
                ? message.receiver_id
                : message.sender_id
            )
            .filter(Boolean)
        )
      );

      if (otherUserIds.length > 0) {
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id, first_name, last_name, avatar_url")
            .in("id", otherUserIds);

        if (profileError) {
          console.error(
            "Profiller yüklenemedi:",
            profileError
          );
        } else {
          setProfiles((profileData || []) as Profile[]);
        }
      } else {
        setProfiles([]);
      }

      setLoading(false);
    };

    loadMessages();
  }, [currentUserId]);

  /*
   * ---------------------------------------------------------
   * REALTIME
   * ---------------------------------------------------------
   *
   * Yeni mesaj geldiğinde sayfayı yenilemeden ekrana ekler.
   */

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;

          if (
            newMessage.sender_id !== currentUserId &&
            newMessage.receiver_id !== currentUserId
          ) {
            return;
          }

          setMessages((current) => {
            const exists = current.some(
              (message) => message.id === newMessage.id
            );

            if (exists) return current;

            return [...current, newMessage];
          });

          /*
           * Yeni mesajın göndereninin profilini de getir.
           */

          const otherUserId =
            newMessage.sender_id === currentUserId
              ? newMessage.receiver_id
              : newMessage.sender_id;

          const alreadyLoaded = profiles.some(
            (profile) => profile.id === otherUserId
          );

          if (!alreadyLoaded) {
            supabase
              .from("profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", otherUserId)
              .single()
              .then(({ data }) => {
                if (data) {
                  setProfiles((current) => {
                    if (
                      current.some(
                        (profile) => profile.id === data.id
                      )
                    ) {
                      return current;
                    }

                    return [...current, data as Profile];
                  });
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, profiles]);

  /*
   * ---------------------------------------------------------
   * CONVERSATIONS
   * ---------------------------------------------------------
   */

  const conversations = useMemo(() => {
    if (!currentUserId) return [];

    const conversationMap = new Map<string, Conversation>();

    messages.forEach((message) => {
      const otherUserId =
        message.sender_id === currentUserId
          ? message.receiver_id
          : message.sender_id;

      const profile = profiles.find(
        (item) => item.id === otherUserId
      );

      if (!profile) return;

      const existing = conversationMap.get(otherUserId);

      const unread =
        message.receiver_id === currentUserId
          ? 1
          : 0;

      if (!existing) {
        conversationMap.set(otherUserId, {
          user: profile,
          messages: [message],
          lastMessage: message,
          unread,
        });
      } else {
        existing.messages.push(message);

        if (
          new Date(message.created_at).getTime() >
          new Date(existing.lastMessage.created_at).getTime()
        ) {
          existing.lastMessage = message;
        }

        existing.unread += unread;
      }
    });

    return Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
    );
  }, [messages, profiles, currentUserId]);

  /*
   * ---------------------------------------------------------
   * SEARCH
   * ---------------------------------------------------------
   */

  const filteredConversations = useMemo(() => {
    if (!search.trim()) {
      return conversations;
    }

    const query = search.toLowerCase();

    return conversations.filter((conversation) => {
      const fullName =
        `${conversation.user.first_name || ""} ${
          conversation.user.last_name || ""
        }`.toLowerCase();

      return (
        fullName.includes(query) ||
        conversation.lastMessage.content
          .toLowerCase()
          .includes(query)
      );
    });
  }, [conversations, search]);

  /*
   * ---------------------------------------------------------
   * SELECTED CONVERSATION
   * ---------------------------------------------------------
   */

  const selectedConversation = conversations.find(
    (conversation) =>
      conversation.user.id === selectedUserId
  );

  const selectedMessages = messages.filter((message) => {
    if (!currentUserId || !selectedUserId) return false;

    return (
      (message.sender_id === currentUserId &&
        message.receiver_id === selectedUserId) ||
      (message.sender_id === selectedUserId &&
        message.receiver_id === currentUserId)
    );
  });

  /*
   * ---------------------------------------------------------
   * SEND MESSAGE
   * ---------------------------------------------------------
   */

  const sendMessage = async () => {
    const text = messageText.trim();

    if (
      !text ||
      !currentUserId ||
      !selectedUserId ||
      sending
    ) {
      return;
    }

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: currentUserId,
        receiver_id: selectedUserId,
        content: text,
      })
      .select()
      .single();

    if (error) {
      console.error("Mesaj gönderilemedi:", error);
      setSending(false);
      return;
    }

    if (data) {
      setMessages((current) => {
        const exists = current.some(
          (message) => message.id === data.id
        );

        if (exists) return current;

        return [...current, data as Message];
      });
    }

    setMessageText("");
    setSending(false);
  };

  /*
   * ---------------------------------------------------------
   * ENTER KEY
   * ---------------------------------------------------------
   */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  /*
   * ---------------------------------------------------------
   * HELPERS
   * ---------------------------------------------------------
   */

  const getFullName = (profile: Profile) => {
    const name =
      `${profile.first_name || ""} ${
        profile.last_name || ""
      }`.trim();

    return name || "Kullanıcı";
  };

  const getInitials = (profile: Profile) => {
    const first =
      profile.first_name?.charAt(0) || "";

    const last =
      profile.last_name?.charAt(0) || "";

    return `${first}${last}`.toUpperCase() || "U";
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="p-8 w-full">

      {/* HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Mesajlar
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Müşteri, ekip ve sistem bildirimlerini yönet.
        </p>
      </div>

      {/* MAIN CARD */}

      <div
        className="
          w-full
          h-[calc(100vh-220px)]
          bg-white
          border
          border-gray-200
          rounded-2xl
          overflow-hidden
          flex
        "
      >

        {/* ================================================= */}
        {/* SOL PANEL */}
        {/* ================================================= */}

        <div
          className="
            w-[340px]
            border-r
            border-gray-200
            flex
            flex-col
          "
        >

          {/* TABS */}

          <div
            className="
              p-4
              border-b
              border-gray-200
              flex
              gap-2
            "
          >

            {[
              {
                label: "Müşteri",
                value: "müşteri",
              },
              {
                label: "Ekip",
                value: "ekip",
              },
              {
                label: "Sistem",
                value: "sistem",
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() =>
                  setActiveTab(tab.value)
                }
                className={`
                  px-3
                  py-2
                  rounded-xl
                  text-xs
                  font-medium
                  ${
                    activeTab === tab.value
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}

          </div>

          {/* SEARCH */}

          <div className="p-4">

            <div className="relative">

              <Search
                size={16}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Mesajlarda ara..."
                className="
                  w-full
                  pl-9
                  pr-4
                  py-2.5
                  rounded-xl
                  bg-gray-100
                  text-sm
                  outline-none
                "
              />

            </div>

          </div>

          {/* LIST */}

          <div className="flex-1 overflow-y-auto">

            {activeTab !== "müşteri" ? (
              <div
                className="
                  h-full
                  flex
                  flex-col
                  items-center
                  justify-center
                  px-6
                  text-center
                "
              >

                <MessageCircle
                  size={28}
                  className="text-gray-300 mb-3"
                />

                <p className="text-sm font-medium text-gray-700">
                  {activeTab === "ekip"
                    ? "Henüz ekip mesajı yok"
                    : "Henüz sistem bildirimi yok"}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Bu bölüm gerçek veri bağlandığında
                  otomatik olarak dolacak.
                </p>

              </div>
            ) : loading ? (

              <div className="p-6 text-center text-sm text-gray-400">
                Mesajlar yükleniyor...
              </div>

            ) : filteredConversations.length === 0 ? (

              <div
                className="
                  h-full
                  flex
                  flex-col
                  items-center
                  justify-center
                  px-6
                  text-center
                "
              >

                <MessageCircle
                  size={30}
                  className="text-gray-300 mb-3"
                />

                <p className="text-sm font-medium text-gray-700">
                  Henüz mesaj yok
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Bir kullanıcıyla mesajlaşmaya
                  başladığında burada görünecek.
                </p>

              </div>

            ) : (

              filteredConversations.map(
                (conversation) => {
                  const profile =
                    conversation.user;

                  const isSelected =
                    selectedUserId === profile.id;

                  return (
                    <div
                      key={profile.id}
                      onClick={() =>
                        setSelectedUserId(profile.id)
                      }
                      className={`
                        p-4
                        flex
                        gap-3
                        cursor-pointer
                        border-b
                        border-gray-100
                        transition
                        ${
                          isSelected
                            ? "bg-gray-50"
                            : "hover:bg-gray-50"
                        }
                      `}
                    >

                      {/* AVATAR */}

                      {profile.avatar_url ? (

                        <img
                          src={profile.avatar_url}
                          alt={getFullName(profile)}
                          className="
                            w-11
                            h-11
                            rounded-full
                            object-cover
                            shrink-0
                          "
                        />

                      ) : (

                        <div
                          className="
                            w-11
                            h-11
                            rounded-full
                            bg-black
                            text-white
                            flex
                            items-center
                            justify-center
                            text-xs
                            font-semibold
                            shrink-0
                          "
                        >
                          {getInitials(profile)}
                        </div>

                      )}

                      {/* CONTENT */}

                      <div className="flex-1 min-w-0">

                        <div className="flex justify-between gap-2">

                          <h3 className="text-sm font-semibold truncate">
                            {getFullName(profile)}
                          </h3>

                          <span className="text-xs text-gray-400 shrink-0">
                            {formatTime(
                              conversation.lastMessage.created_at
                            )}
                          </span>

                        </div>

                        <p className="text-xs text-gray-400 mt-1">
                          Mesaj
                        </p>

                        <p className="text-sm text-gray-600 mt-2 truncate">
                          {conversation.lastMessage.content}
                        </p>

                      </div>

                      {/* UNREAD */}

                      {conversation.unread > 0 && (
                        <span
                          className="
                            w-5
                            h-5
                            rounded-full
                            bg-black
                            text-white
                            text-xs
                            flex
                            items-center
                            justify-center
                            shrink-0
                          "
                        >
                          {conversation.unread}
                        </span>
                      )}

                    </div>
                  );
                }
              )

            )}

          </div>

        </div>

        {/* ================================================= */}
        {/* CHAT */}
        {/* ================================================= */}

        <div className="flex-1 flex flex-col">

          {!selectedConversation ? (

            /* EMPTY CHAT */

            <div
              className="
                flex-1
                flex
                flex-col
                items-center
                justify-center
                bg-gray-50
                text-center
              "
            >

              <div
                className="
                  w-14
                  h-14
                  rounded-full
                  bg-white
                  border
                  border-gray-200
                  flex
                  items-center
                  justify-center
                  mb-4
                "
              >
                <MessageCircle
                  size={24}
                  className="text-gray-400"
                />
              </div>

              <h2 className="text-sm font-semibold text-gray-700">
                Bir konuşma seç
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Mesajlaşmaya başlamak için soldan
                bir kullanıcı seç.
              </p>

            </div>

          ) : (

            <>
              {/* CHAT HEADER */}

              <div
                className="
                  p-5
                  border-b
                  border-gray-200
                  flex
                  justify-between
                  items-center
                "
              >

                <div className="flex items-center gap-3">

                  {selectedConversation.user.avatar_url ? (

                    <img
                      src={
                        selectedConversation.user.avatar_url
                      }
                      alt={getFullName(
                        selectedConversation.user
                      )}
                      className="
                        w-10
                        h-10
                        rounded-full
                        object-cover
                      "
                    />

                  ) : (

                    <div
                      className="
                        w-10
                        h-10
                        rounded-full
                        bg-black
                        text-white
                        flex
                        items-center
                        justify-center
                        text-xs
                        font-semibold
                      "
                    >
                      {getInitials(
                        selectedConversation.user
                      )}
                    </div>

                  )}

                  <div>

                    <h2 className="font-semibold">
                      {getFullName(
                        selectedConversation.user
                      )}
                    </h2>

                    <p className="text-sm text-gray-500">
                      HireHub kullanıcısı
                    </p>

                  </div>

                </div>

              </div>

              {/* MESSAGES */}

              <div
                className="
                  flex-1
                  p-6
                  space-y-4
                  bg-gray-50
                  overflow-y-auto
                "
              >

                {selectedMessages.length === 0 ? (

                  <div
                    className="
                      h-full
                      flex
                      items-center
                      justify-center
                      text-sm
                      text-gray-400
                    "
                  >
                    Henüz mesaj yok. İlk mesajı sen gönder.
                  </div>

                ) : (

                  selectedMessages.map((message) => {

                    const isMe =
                      message.sender_id === currentUserId;

                    return (
                      <div
                        key={message.id}
                        className={`
                          flex
                          ${
                            isMe
                              ? "justify-end"
                              : "justify-start"
                          }
                        `}
                      >

                        <div
                          className={`
                            max-w-[420px]
                            px-4
                            py-3
                            rounded-2xl
                            text-sm
                            ${
                              isMe
                                ? "bg-black text-white"
                                : "bg-white border border-gray-200"
                            }
                          `}
                        >

                          <div className="whitespace-pre-wrap break-words">
                            {message.content}
                          </div>

                          <span
                            className="
                              block
                              text-[11px]
                              mt-2
                              opacity-60
                            "
                          >
                            {formatTime(
                              message.created_at
                            )}
                          </span>

                        </div>

                      </div>
                    );
                  })

                )}

              </div>

              {/* SEND */}

              <div
                className="
                  p-5
                  border-t
                  border-gray-200
                  flex
                  gap-3
                "
              >

                <input
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Mesaj yaz..."
                  disabled={sending}
                  className="
                    flex-1
                    px-4
                    py-3
                    rounded-xl
                    bg-gray-100
                    text-sm
                    outline-none
                    disabled:opacity-50
                  "
                />

                <button
                  onClick={sendMessage}
                  disabled={
                    sending ||
                    !messageText.trim()
                  }
                  className="
                    px-5
                    rounded-xl
                    bg-black
                    text-white
                    text-sm
                    flex
                    items-center
                    gap-2
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                  "
                >

                  <Send size={16} />

                  {sending
                    ? "Gönderiliyor..."
                    : "Gönder"}

                </button>

              </div>
            </>
          )}

        </div>

      </div>

    </main>
  );
}