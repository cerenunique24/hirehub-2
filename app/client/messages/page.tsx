"use client";

import { Input } from "@/components/ui/Input";
import { buttonClasses } from "@/components/ui/Button";
import { pageHeaderClass } from "@/components/ui/PageHeader";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import shellStyles from "@/components/layout/AppShell.module.css";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyUsers } from "@/lib/notifications";
import { CONTACT_INFO_MESSAGE, containsContactInfo } from "@/lib/moderation/contactInfoFilter";
import {
  Send,
  Search,
  MessageCircle,
  Paperclip,
  Users,
  ArrowLeft,
  FileText,
  X,
} from "lucide-react";
import TeamMessagesPanel from "@/components/coalitions/TeamMessagesPanel";
import ReportButton from "@/components/safety/ReportButton";
import BlockUserButton from "@/components/safety/BlockUserButton";
import { publicDisplayName, displayInitial } from "@/lib/utils/displayName";
import MessageAttachmentView from "@/components/messaging/MessageAttachmentView";
import { messagePreview, messageSearchText } from "@/lib/messaging/conversations";
import {
  ATTACHMENT_ACCEPT,
  deleteMessageAttachment,
  uploadMessageAttachment,
  validateAttachment,
} from "@/lib/messaging/attachments";

type TeamConversation = {
  coalitionId: string;
  name: string;
  projectTitle: string | null;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role?: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  project_id?: string | null;
  coalition_id?: string | null;
  content: string | null;
  proposal_id: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  read_at: string | null;
  created_at: string;
};

type Conversation = {
  user: Profile;
  messages: Message[];
  lastMessage: Message;
  unread: number;
  proposalId: string | null;
  projectId: string | null;
  projectTitle: string | null;
};

/*
 * Supabase/PostgREST, proposals.project_id gibi bir foreign key
 * üzerinden yapılan "many-to-one" embed'i TEK BİR OBJE olarak
 * döndürür, dizi olarak değil. Kod daha önce `.projects?.[0]?.title`
 * şeklinde diziymiş gibi okuyordu; bu her zaman undefined dönüp
 * "Proje" fallback'ine düşüyordu.
 */
function extractProject(
  value: unknown
): { id: string; title: string } | null {
  if (Array.isArray(value)) {
    return (value[0] as { id: string; title: string } | undefined) ?? null;
  }

  if (value && typeof value === "object" && "title" in value) {
    return value as { id: string; title: string };
  }

  return null;
}

function ClientMessagesContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<
    "freelancers" | "teams"
  >("freelancers");

  const [currentUserId, setCurrentUserId] = useState<
    string | null
  >(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [projectNames, setProjectNames] = useState<
    Record<string, string>
  >({});

  const [projectIds, setProjectIds] = useState<
    Record<string, string>
  >({});

  const [selectedUserId, setSelectedUserId] = useState<
    string | null
  >(null);

  const [selectedProposalId, setSelectedProposalId] =
    useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [messageText, setMessageText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [sendError, setSendError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [teamConversations, setTeamConversations] = useState<
    TeamConversation[]
  >([]);

  const [selectedCoalitionId, setSelectedCoalitionId] = useState<
    string | null
  >(null);

  const [teamMemberLabels, setTeamMemberLabels] = useState<
    { id: string; name: string }[]
  >([]);

  /*
   * URL PARAMETRELERİ
   * /client/messages?user=UUID&proposal=UUID
   */
  useEffect(() => {
    const userId = searchParams.get("user");
    const proposalId = searchParams.get("proposal");
    const projectId = searchParams.get("project");

    setSelectedUserId(userId);
    setSelectedProposalId(proposalId);
    setSelectedProjectId(projectId);
  }, [searchParams]);

  /*
   * MEVCUT KULLANICI
   */
  useEffect(() => {
    let active = true;

    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
    };

    void getCurrentUser();

    return () => {
      active = false;
    };
  }, [supabase]);

  /*
   * EKİP KONUŞMALARI (coalitions.project_id != null) — proje bazlı team
   * conversation'lar. Mevcut RLS zaten sadece client'ın kendi projesine
   * bağlı coalition'ları döndürür, ekstra filtre gerekmiyor.
   */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let active = true;

    const loadTeamConversations = async () => {
      const { data, error } = await supabase
        .from("coalitions")
        .select("id, name, project_id, projects(title)")
        .not("project_id", "is", null)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (error) {
        console.error("Ekip konuşmaları yüklenemedi:", error);
        return;
      }

      setTeamConversations(
        (data ?? []).map((row) => {
          const project = Array.isArray(row.projects)
            ? row.projects[0]
            : row.projects;

          return {
            coalitionId: row.id,
            name: row.name,
            projectTitle: (project as { title?: string } | null)?.title ?? null,
          };
        })
      );
    };

    void loadTeamConversations();

    return () => {
      active = false;
    };
  }, [currentUserId, supabase]);

  /*
   * Seçilen ekip konuşmasının üyeleri (mesajlarda isim göstermek için).
   */
  useEffect(() => {
    if (!selectedCoalitionId) {
      setTeamMemberLabels([]);
      return;
    }

    let active = true;

    const loadTeamMembers = async () => {
      const { data: memberRows } = await supabase
        .from("coalition_members")
        .select("user_id")
        .eq("coalition_id", selectedCoalitionId)
        .eq("status", "active");

      const userIds = (memberRows ?? []).map((row) => row.user_id);

      if (userIds.length === 0) {
        if (active) setTeamMemberLabels([]);
        return;
      }

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, first_name")
        .in("id", userIds);

      if (!active) return;

      setTeamMemberLabels(
        (profileRows ?? []).map((profile) => ({
          id: profile.id,
          name: publicDisplayName(profile, "Ekip üyesi"),
        }))
      );
    };

    void loadTeamMembers();

    return () => {
      active = false;
    };
  }, [selectedCoalitionId, supabase]);

  /*
   * MESAJLARI YÜKLE
   */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let active = true;

    const loadMessages = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .not("receiver_id", "is", null)
        .or(
          `sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`
        )
        .order("created_at", {
          ascending: true,
        });

      if (!active) {
        return;
      }

      if (error) {
        console.error("Mesajlar yüklenemedi:", error);
        setLoadError(
          "Mesajlar yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin."
        );
        setLoading(false);
        return;
      }

      const loadedMessages = (data ?? []) as Message[];

      setMessages(loadedMessages);

      /*
       * İlgili projelerin isimlerini getir.
       */
      const proposalIds = [
        ...new Set(
          loadedMessages
            .map((message) => message.proposal_id)
            .filter(
              (id): id is string => Boolean(id)
            )
        ),
      ];

      if (proposalIds.length > 0) {
        const { data: proposalRows } = await supabase
          .from("proposals")
          .select("id, projects(id, title)")
          .in("id", proposalIds);

        const names: Record<string, string> = {};
        const ids: Record<string, string> = {};

        for (const proposal of (proposalRows ?? []) as Array<{
          id: string;
          projects: unknown;
        }>) {
          const project = extractProject(proposal.projects);
          names[proposal.id] = project?.title ?? "Proje";
          if (project?.id) {
            ids[proposal.id] = project.id;
          }
        }

        if (active) {
          setProjectNames(names);
          setProjectIds(ids);
        }
      } else {
        setProjectNames({});
        setProjectIds({});
      }

      /*
       * Konuşmalardaki diğer kullanıcıları bul.
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

      /*
       * URL ile gelen kullanıcı henüz mesaj göndermemiş
       * olsa bile profilini yükle.
       */
      const urlUserId = searchParams.get("user");

      if (
        urlUserId &&
        urlUserId !== currentUserId &&
        !otherUserIds.includes(urlUserId)
      ) {
        otherUserIds.push(urlUserId);
      }

      if (otherUserIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, first_name, avatar_url, role"
          )
          .in("id", otherUserIds);

        if (!active) {
          return;
        }

        if (profileError) {
          console.error(
            "Profiller yüklenemedi:",
            profileError
          );
        } else {
          setProfiles(
            (profileData ?? []) as Profile[]
          );
        }
      } else {
        setProfiles([]);
      }

      setLoading(false);
    };

    void loadMessages();

    return () => {
      active = false;
    };
  }, [currentUserId, supabase, searchParams]);

  /*
   * REALTIME MESAJLAR
   *
   * Yeni mesaj geldiğinde listeyi otomatik günceller.
   */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let active = true;

    const channelName = `client-messages-${currentUserId}`;

    /*
     * Aynı isimde eski bir channel kalmışsa temizle.
     */
    const existingChannels = supabase
      .getChannels()
      .filter(
        (existingChannel) =>
          existingChannel.topic ===
          `realtime:${channelName}`
      );

    existingChannels.forEach((existingChannel) => {
      void supabase.removeChannel(existingChannel);
    });

    /*
     * ÖNCE .on()
     * SONRA .subscribe()
     */


    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {


          if (!active) {

            return;
          }

          const newMessage = payload.new as Message;
          if (newMessage.receiver_id === null || newMessage.coalition_id) return;

          /*
           * Mesaj mevcut kullanıcıyla ilgili değilse
           * hiçbir işlem yapma.
           */
          if (
            newMessage.sender_id !== currentUserId &&
            newMessage.receiver_id !== currentUserId
          ) {

            return;
          }

          /*
           * Mesajı listeye ekle.
           * Duplicate kontrolü yap.
           */
          setMessages((current) => {
            if (
              current.some(
                (message) =>
                  message.id === newMessage.id
              )
            ) {
              return current;
            }

            return [...current, newMessage];
          });

          /*
           * Mesajın karşı tarafını bul.
           */
          const otherUserId =
            newMessage.sender_id === currentUserId
              ? newMessage.receiver_id
              : newMessage.sender_id;

          /*
           * Karşı tarafın profilini getir.
           */
          const { data: profileData } =
            await supabase
              .from("profiles")
              .select(
                "id, first_name, avatar_url, role"
              )
              .eq("id", otherUserId)
              .maybeSingle();

          if (!active || !profileData) {
            return;
          }

          setProfiles((currentProfiles) => {
            if (
              currentProfiles.some(
                (profile) =>
                  profile.id === profileData.id
              )
            ) {
              return currentProfiles;
            }

            return [
              ...currentProfiles,
              profileData as Profile,
            ];
          });

          /*
           * Yeni mesaj bir proposal'a bağlıysa
           * proje adını da getir.
           */
          if (newMessage.proposal_id) {
            const alreadyLoaded =
              projectNames[
                newMessage.proposal_id
              ];

            if (!alreadyLoaded) {
              const { data: proposalData } =
                await supabase
                  .from("proposals")
                  .select("id, projects(id, title)")
                  .eq(
                    "id",
                    newMessage.proposal_id
                  )
                  .maybeSingle();

              if (
                active &&
                proposalData
              ) {
                const project = extractProject(
                  proposalData.projects
                );

                setProjectNames((current) => ({
                  ...current,
                  [newMessage.proposal_id!]:
                    project?.title ?? "Proje",
                }));

                if (project?.id) {
                  setProjectIds((current) => ({
                    ...current,
                    [newMessage.proposal_id!]: project.id,
                  }));
                }
              }
            }
          }
        }
      )
      .subscribe();

    /*
     * Cleanup
     */
    return () => {

      active = false;
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  /*
   * KONUŞMALAR
   *
   * Client tarafında yalnızca freelancer
   * konuşmaları gösterilir.
   */
  const conversations = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    const conversationMap =
      new Map<string, Conversation>();

    messages.forEach((message) => {
      const otherUserId =
        message.sender_id === currentUserId
          ? message.receiver_id
          : message.sender_id;

      const profile = profiles.find(
        (item) => item.id === otherUserId
      );

      if (!profile) {
        return;
      }

      /*
       * Client tarafında yalnızca freelancerlar.
       */
      if (
        profile.role &&
        profile.role !== "freelancer"
      ) {
        return;
      }

      const conversationKey = `${otherUserId}:${message.proposal_id ?? message.project_id ?? "legacy"}`;

      const existing =
        conversationMap.get(
          conversationKey
        );

      const unread =
        message.receiver_id ===
          currentUserId &&
        message.read_at === null
          ? 1
          : 0;

      if (!existing) {
        conversationMap.set(
          conversationKey,
          {
            user: profile,
            messages: [message],
            lastMessage: message,
            unread,
            proposalId:
              message.proposal_id,
            projectId: message.project_id ?? (message.proposal_id ? projectIds[message.proposal_id] ?? null : null),
            projectTitle: message.project_id ? "Proje konuşması" : message.proposal_id ? projectNames[message.proposal_id] ?? "Proje" : "Genel konuşma",
          }
        );
      } else {
        existing.messages.push(message);

        if (
          new Date(
            message.created_at
          ).getTime() >
          new Date(
            existing.lastMessage.created_at
          ).getTime()
        ) {
          existing.lastMessage = message;
        }

        existing.unread += unread;
      }
    });

    /*
     * URL ile gelen kullanıcı henüz konuşma
     * başlatmamışsa geçici konuşma oluştur.
     */
    if (selectedUserId) {
      const selectedProfile =
        profiles.find(
          (profile) =>
            profile.id === selectedUserId
        );

      const conversationExists =
        Array.from(
          conversationMap.values()
        ).some(
          (conversation) =>
            conversation.user.id ===
              selectedUserId &&
            conversation.proposalId === selectedProposalId && conversation.projectId === selectedProjectId
        );

      if (
        selectedProfile &&
        !conversationExists
      ) {
        conversationMap.set(
          `${selectedUserId}:${
            selectedProposalId ?? selectedProjectId ?? "legacy"
          }`,
          {
            user: selectedProfile,
            messages: [],
            lastMessage: {
              id: "temporary",
              sender_id: "",
              receiver_id: "",
              proposal_id:
                selectedProposalId,
              content: "",
              attachment_url: null,
              attachment_name: null,
              attachment_type: null,
              read_at: null,
              created_at:
                new Date().toISOString(),
            },
            unread: 0,
            proposalId:
              selectedProposalId,
            projectId: selectedProposalId ? projectIds[selectedProposalId] ?? null : selectedProjectId,
            projectTitle:
              selectedProposalId
                ? projectNames[
                    selectedProposalId
                  ] ?? "Proje"
                : "Genel konuşma",
          }
        );
      }
    }

    return Array.from(
      conversationMap.values()
    ).sort(
      (a, b) =>
        new Date(
          b.lastMessage.created_at
        ).getTime() -
        new Date(
          a.lastMessage.created_at
        ).getTime()
    );
  }, [
    messages,
    profiles,
    currentUserId,
    projectNames,
    projectIds,
    selectedUserId,
    selectedProposalId,
    selectedProjectId,
  ]);

  /*
   * ARAMA
   */
  const filteredConversations =
    useMemo(() => {
      if (!search.trim()) {
        return conversations;
      }

      const query =
        search.toLocaleLowerCase("tr-TR");

      return conversations.filter(
        (conversation) => {
          const fullName = publicDisplayName(conversation.user, "").toLocaleLowerCase("tr-TR");

          const projectTitle =
            (
              conversation.projectTitle ??
              ""
            ).toLocaleLowerCase(
              "tr-TR"
            );

          const message =
            messageSearchText(conversation.lastMessage);

          return (
            fullName.includes(query) ||
            projectTitle.includes(query) ||
            message.includes(query)
          );
        }
      );
    }, [conversations, search]);

  const selectedProfile =
    profiles.find(
      (profile) =>
        profile.id === selectedUserId
    );

  /*
   * SEÇİLİ KONUŞMANIN MESAJLARI
   */
  const selectedMessages = messages.filter(
    (message) => {
      if (
        !currentUserId ||
        !selectedUserId
      ) {
        return false;
      }

      const isConversation =
        (message.sender_id ===
          currentUserId &&
          message.receiver_id ===
            selectedUserId) ||
        (message.sender_id ===
          selectedUserId &&
          message.receiver_id ===
            currentUserId);

      if (!isConversation) return false;
      if (selectedProposalId) return message.proposal_id === selectedProposalId;
      if (selectedProjectId) return message.project_id === selectedProjectId && !message.proposal_id;
      return message.proposal_id === null && !message.project_id;
    }
  );

  /*
   * OKUNMAMIŞ MESAJLARI OKUNDU YAP
   */
  useEffect(() => {
    if (
      !currentUserId ||
      !selectedUserId
    ) {
      return;
    }

    const unreadIds =
      selectedMessages
        .filter(
          (message) =>
            message.sender_id ===
              selectedUserId &&
            message.receiver_id ===
              currentUserId &&
            !message.read_at
        )
        .map(
          (message) => message.id
        );

    if (!unreadIds.length) {
      return;
    }

    const readAt =
      new Date().toISOString();

    void supabase
      .from("messages")
      .update({
        read_at: readAt,
      })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) {
          console.error(
            "Mesajlar güncellenemedi:",
            error
          );
          return;
        }

        setMessages((current) =>
          current.map((message) =>
            unreadIds.includes(
              message.id
            )
              ? {
                  ...message,
                  read_at: readAt,
                }
              : message
          )
        );
      });
  }, [
    currentUserId,
    selectedUserId,
    selectedProposalId,
    selectedMessages,
    supabase,
  ]);

  /*
   * MESAJ GÖNDER
   */
  const sendMessage = async () => {
    const text =
      messageText.trim();

    if (
      (!text && !attachmentFile) ||
      !currentUserId ||
      !selectedUserId ||
      sending
    ) {
      return;
    }

    if (text && containsContactInfo(text)) {
      setSendError(CONTACT_INFO_MESSAGE);
      return;
    }

    setSending(true);
    setSendError("");

    let attachment: { url: string; name: string; type: string } | null = null;

    if (attachmentFile) {
      const { data: uploaded, error: uploadError } = await uploadMessageAttachment(
        supabase,
        currentUserId,
        attachmentFile
      );
      if (uploadError || !uploaded) {
        setSendError(uploadError ?? "Dosya yüklenemedi.");
        setSending(false);
        return;
      }
      attachment = uploaded;
    }

    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiverId: selectedUserId,
        proposalId: selectedProposalId,
        projectId: selectedProposalId ? projectIds[selectedProposalId] ?? null : selectedProjectId,
        content: text,
        attachmentUrl: attachment?.url ?? null,
        attachmentName: attachment?.name ?? null,
        attachmentType: attachment?.type ?? null,
      }),
    });
    const responseData = await response.json().catch(() => ({}));
    const data = responseData.message as Message | undefined;
    const error = response.ok ? null : { message: responseData.error as string | undefined };

    if (error) {
      console.error(
        "Mesaj gönderilemedi:",
        error
      );

      if (attachment) {
        await deleteMessageAttachment(supabase, attachment.url);
      }

      setSendError(error.message || "Mesaj gönderilemedi. Lütfen tekrar deneyin.");

      setSending(false);
      return;
    }

    if (data) {
      setMessages((current) => {
        if (
          current.some(
            (message) =>
              message.id === data.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          data as Message,
        ];
      });

      if (selectedUserId) {
        await notifyUsers(supabase, [
          {
            userId: selectedUserId,
            type: "message_received",
            title: "Yeni mesaj geldi",
            message: text
              ? text.length > 80 ? `${text.slice(0, 80)}…` : text
              : "Bir ek dosya gönderdi.",
            link: `/freelancers/messages?user=${encodeURIComponent(currentUserId ?? "")}`,
          },
        ]);
      }
    }

    setMessageText("");
    setAttachmentFile(null);
    setSending(false);
  };

  /*
   * YARDIMCI FONKSİYONLAR
   */
  const getFullName = (profile: Profile) => publicDisplayName(profile, "Kullanıcı");

  const getInitials = (profile: Profile) => displayInitial(profile);

  function onPickAttachment(file: File | undefined | null) {
    if (!file) return;
    const validationError = validateAttachment(file);
    if (validationError) {
      setAttachmentError(validationError);
      return;
    }
    setAttachmentError("");
    setAttachmentFile(file);
  }

  const formatTime = (
    date: string
  ) =>
    new Date(date).toLocaleTimeString(
      "tr-TR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  return (
    <main className={shellStyles.workspacePage}>
      <div className={pageHeaderClass}>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          Mesajlar
        </h1>

        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Freelancerlar ve ekiplerle iletişimini yönet.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--color-error-600)]/20 bg-[var(--color-error-50)] px-4 py-3 text-sm text-[var(--color-error-600)]">
          {loadError}
        </div>
      )}

      <div className={[shellStyles.messages,"flex w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white"].join(" ")}>
        {/* SOL PANEL — mobilde bir konuşma seçildiğinde gizlenir, sohbet paneli tam ekran olur */}
        <div
          className={`w-full shrink-0 flex-col border-[var(--color-border-subtle)] md:flex md:w-[340px] md:border-r ${
            (activeTab === "freelancers" && selectedUserId) ||
            (activeTab === "teams" && selectedCoalitionId)
              ? "hidden"
              : "flex"
          }`}
        >
          {/* TABLAR */}
          <div className="flex gap-2 border-b border-[var(--color-border-subtle)] p-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab("freelancers");
                setSelectedCoalitionId(null);
              }}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                activeTab === "freelancers"
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-gray-200"
              }`}
            >
              Freelancerlar
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("teams");
                setSelectedUserId(null);
                setSelectedProposalId(null);
              }}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                activeTab === "teams"
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-gray-200"
              }`}
            >
              Ekipler
            </button>
          </div>

          {/* ARAMA */}
          <div className="p-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Mesajlarda ara..."
                className="w-full rounded-[var(--radius-card)] bg-[var(--color-surface-2)] py-2.5 pl-9 pr-4 text-sm outline-none"
              />
            </div>
          </div>

          {/* FREELANCERLAR */}
          {activeTab ===
            "freelancers" && (
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-5 text-center text-sm text-[var(--color-text-muted)]">
                  Mesajlar yükleniyor...
                </div>
              ) : filteredConversations.length ===
                0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <MessageCircle
                    size={30}
                    className="mb-3 text-gray-300"
                  />

                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                    Henüz mesaj yok
                  </p>

                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Bir freelancer ile iletişime geçtiğinde burada görünecek.
                  </p>
                </div>
              ) : (
                filteredConversations.map(
                  (conversation) => {
                    const profile =
                      conversation.user;

                    const conversationKey = `${profile.id}-${conversation.proposalId ?? conversation.projectId ?? "legacy"}`;

                    const isSelected =
                      selectedUserId ===
                        profile.id &&
                      selectedProposalId === conversation.proposalId && selectedProjectId === conversation.projectId;

                    return (
                      <button
                        type="button"
                        key={
                          conversationKey
                        }
                        onClick={() => {
                          setSelectedUserId(
                            profile.id
                          );

                          setSelectedProposalId(conversation.proposalId);
                          setSelectedProjectId(conversation.proposalId ? null : conversation.projectId);
                        }}
                        className={`flex w-full gap-3 border-b border-[var(--color-border-subtle)] p-4 text-left transition ${
                          isSelected
                            ? "bg-[var(--color-surface-2)]"
                            : "hover:bg-[var(--color-surface-2)]"
                        }`}
                      >
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              profile.avatar_url
                            }
                            alt={getFullName(
                              profile
                            )}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-xs font-semibold text-white">
                            {getInitials(
                              profile
                            )}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-2">
                            <h3 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                              {getFullName(
                                profile
                              )}
                            </h3>

                            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                              {formatTime(
                                conversation
                                  .lastMessage
                                  .created_at
                              )}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                            {
                              conversation.projectTitle
                            }{" "}
                            ·{" "}
                            {messagePreview(conversation.lastMessage)}
                          </p>
                        </div>

                        {conversation.unread >
                          0 && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                        )}
                      </button>
                    );
                  }
                )
              )}
            </div>
          )}

          {/* EKİPLER */}
          {activeTab === "teams" && (
            <div className="flex-1 overflow-y-auto">
              {teamConversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Users
                    size={32}
                    className="mb-3 text-gray-300"
                  />

                  <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                    Henüz ekip konuşması yok
                  </p>

                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Bir ekip projesi için ilk freelancer kabul edildiğinde
                    burada görünecek.
                  </p>
                </div>
              ) : (
                teamConversations.map((conversation) => (
                  <button
                    type="button"
                    key={conversation.coalitionId}
                    onClick={() =>
                      setSelectedCoalitionId(conversation.coalitionId)
                    }
                    className={`flex w-full items-center gap-3 border-b border-[var(--color-border-subtle)] p-4 text-left transition ${
                      selectedCoalitionId === conversation.coalitionId
                        ? "bg-[var(--color-surface-2)]"
                        : "hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white">
                      <Users size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {conversation.name}
                      </h3>

                      <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                        {conversation.projectTitle ?? "Ekip mesajlaşması"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* CHAT PANEL — mobilde yalnızca bir konuşma seçiliyken görünür */}
        <div
          className={`min-w-0 flex-1 flex-col md:flex ${
            (activeTab === "freelancers" && selectedUserId) ||
            (activeTab === "teams" && selectedCoalitionId)
              ? "flex"
              : "hidden"
          }`}
        >
          {activeTab === "teams" ? (
            selectedCoalitionId && currentUserId ? (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] p-4 md:hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedCoalitionId(null)}
                    className="text-[var(--color-text-secondary)]"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {
                      teamConversations.find(
                        (item) => item.coalitionId === selectedCoalitionId
                      )?.name
                    }
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <TeamMessagesPanel
                    coalitionId={selectedCoalitionId}
                    currentUserId={currentUserId}
                    memberLabels={teamMemberLabels}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-[var(--color-surface-2)] text-sm text-[var(--color-text-muted)]">
                Bir ekip konuşması seç.
              </div>
            )
          ) : !selectedProfile ? (
            <div className="flex flex-1 flex-col items-center justify-center bg-[var(--color-surface-2)]">
              <MessageCircle
                size={30}
                className="mb-3 text-gray-300"
              />

              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Bir konuşma seç
              </p>

              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Soldan bir kullanıcı seçerek mesajlaşmaya başla.
              </p>
            </div>
          ) : (
            <>
              {/* CHAT HEADER */}
              <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] p-5">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  aria-label="Konuşma listesine dön"
                  className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] md:hidden"
                >
                  <ArrowLeft size={18} />
                </button>

                {selectedProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      selectedProfile.avatar_url
                    }
                    alt={getFullName(
                      selectedProfile
                    )}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-xs font-semibold text-white">
                    {getInitials(
                      selectedProfile
                    )}
                  </div>
                )}

                <div>
                  <h2 className="font-semibold text-[var(--color-text-primary)]">
                    {getFullName(
                      selectedProfile
                    )}
                  </h2>

                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {selectedProposalId ? (
                      <>
                        {projectIds[selectedProposalId] ? (
                          <Link
                            href={`/client/projects/${
                              projectIds[selectedProposalId]
                            }?ref=messages&user=${encodeURIComponent(
                              selectedUserId ?? ""
                            )}&proposal=${encodeURIComponent(
                              selectedProposalId
                            )}`}
                            className="font-medium text-[var(--color-text-primary)] hover:underline"
                          >
                            {projectNames[selectedProposalId] ?? "Proje"}
                          </Link>
                        ) : (
                          projectNames[selectedProposalId] ?? "Proje"
                        )}{" "}
                        · Teklif üzerinden
                      </>
                    ) : (
                      "Freelancer"
                    )}
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-start justify-end gap-2">
                  <ReportButton targetType="user" targetId={selectedProfile.id} label="Şikayet Et" />
                  <BlockUserButton targetUserId={selectedProfile.id} />
                </div>
              </div>

              {/* MESSAGES */}
              <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--color-surface-2)] p-5">
                {selectedMessages.length ===
                0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
                    Henüz mesaj yok. İlk mesajı sen gönder.
                  </div>
                ) : (
                  selectedMessages.map(
                    (message) => {
                      const isMe =
                        message.sender_id ===
                        currentUserId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isMe
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-[var(--radius-card)] px-4 py-3 text-sm ${
                              isMe
                                ? "bg-[var(--color-primary-600)] text-white"
                                : "border border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)]"
                            }`}
                          >
                            {message.content && (
                              <p className="whitespace-pre-wrap break-words">
                                {
                                  message.content
                                }
                              </p>
                            )}

                            {message.attachment_url && (
                              <MessageAttachmentView
                                path={message.attachment_url}
                                name={message.attachment_name}
                                type={message.attachment_type}
                                tone={isMe ? "mine" : "theirs"}
                              />
                            )}

                            <span className="mt-2 block text-xs opacity-60">
                              {formatTime(
                                message.created_at
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>

              {/* INPUT */}
              <div className="border-t border-[var(--color-border-subtle)] p-5">
                {sendError && (
                  <p className="mb-3 text-sm text-[var(--color-error-600)]">{sendError}</p>
                )}
                {attachmentError && (
                  <p className="mb-3 text-sm text-[var(--color-error-600)]">{attachmentError}</p>
                )}
                {attachmentFile && (
                  <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                    <FileText size={15} />
                    <span className="flex-1 truncate">{attachmentFile.name}</span>
                    <button
                      type="button"
                      aria-label="Ek dosyayı kaldır"
                      onClick={() => setAttachmentFile(null)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex gap-3">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept={ATTACHMENT_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    onPickAttachment(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  aria-label="Dosya ekle"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={sending}
                  className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] transition hover:bg-gray-200 disabled:opacity-40"
                >
                  <Paperclip size={18} />
                </button>

                <Input
                  value={messageText}
                  onChange={(event) =>
                    setMessageText(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Mesaj yaz..."
                  disabled={sending}
                  className="flex-1 rounded-[var(--radius-card)] bg-[var(--color-surface-2)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                />

                <button
                  type="button"
                  onClick={() =>
                    void sendMessage()
                  }
                  disabled={
                    sending ||
                    (!messageText.trim() && !attachmentFile)
                  }
                  className={buttonClasses({variant:"primary"})}
                >
                  <Send size={16} />

                  {sending
                    ? "Gönderiliyor..."
                    : "Gönder"}
                </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ClientMessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-sm text-[var(--color-text-muted)]">
            Mesajlar yükleniyor...
          </div>
        </main>
      }
    >
      <ClientMessagesContent />
    </Suspense>
  );
}
