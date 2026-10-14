"use client";
import { PageHeader, pageHeaderClass } from "@/components/ui/PageHeader";
import shellStyles from "@/components/layout/FreelancerShell.module.css";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notifyUsers } from "@/lib/notifications";
import { usePremium } from "@/lib/hooks/usePremium";
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
import MessageAttachmentView from "@/components/messaging/MessageAttachmentView";
import { messagePreview, messageSearchText } from "@/lib/messaging/conversations";
import ReportButton from "@/components/safety/ReportButton";
import BlockUserButton from "@/components/safety/BlockUserButton";
import { publicDisplayName, displayInitial } from "@/lib/utils/displayName";
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
 * "Proje" fallback'ine düşüyordu. Bu yardımcı hem obje hem de
 * (ileride şekli değişirse) dizi durumunu güvenle karşılar.
 */
function extractProject(
  value: unknown
): { id: string; title: string; status: string | null } | null {
  if (Array.isArray(value)) {
    return (
      (value[0] as { id: string; title: string; status: string | null } | undefined) ?? null
    );
  }

  if (value && typeof value === "object" && "title" in value) {
    return value as { id: string; title: string; status: string | null };
  }

  return null;
}

function FreelancerMessagesContent() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<
    "clients" | "teams"
  >("clients");

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

  const [projectStatuses, setProjectStatuses] = useState<
    Record<string, string | null>
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loadError, setLoadError] = useState("");

  const [teamConversations, setTeamConversations] = useState<
    TeamConversation[]
  >([]);

  const [selectedCoalitionId, setSelectedCoalitionId] = useState<
    string | null
  >(null);

  const [teamMemberLabels, setTeamMemberLabels] = useState<
    { id: string; name: string }[]
  >([]);

  const { can: canUseMessagingFeature, loading: premiumLoading } = usePremium();

  /*
   * YENİ (henüz hiç mesajı olmayan) KONUŞMA YETKİ KONTROLÜ
   * ----------------------------------------------------
   * URL'den gelen ?user=&proposal= ile, hiç mesajı olmayan bir
   * konuşma açılmaya çalışılıyorsa, gerçek yetki server-side
   * `/api/messages/send`'de zaten kontrol edilir — ama UI'ın
   * kullanıcıya "bu konuşma açık, yaz gönder" izlenimi vermemesi
   * için burada da (RLS'e saygılı, salt-okunur) bir ön kontrol
   * yapılır. Bu SADECE görüntü amaçlıdır; asıl yetkilendirme
   * sunucuda tekrarlanır.
   */
  const [newConversationCheck, setNewConversationCheck] = useState<{
    key: string;
    authorized: boolean;
  } | null>(null);

  /*
   * URL'DEN GELEN KONUŞMAYI SEÇ
   *
   * /freelancers/messages?user=CLIENT_ID&proposal=PROPOSAL_ID
   */
  useEffect(() => {
    const userId = searchParams.get("user");
    const proposalId = searchParams.get("proposal");
    const projectId = searchParams.get("project");

    if (userId) {
      setSelectedUserId(userId);
    }

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
   * EKİP KONUŞMALARI — freelancer'ın aktif üyesi olduğu, projeye bağlı
   * (project_id != null) coalition'lar. Mevcut RLS zaten sadece bu
   * freelancer'ın üyesi olduğu coalition'ları döndürür.
   */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let active = true;

    const loadTeamConversations = async () => {
      const { data: memberRows, error: memberError } = await supabase
        .from("coalition_members")
        .select("coalition_id")
        .eq("user_id", currentUserId)
        .eq("status", "active");

      if (!active) return;

      if (memberError) {
        console.error("Ekip üyelikleri yüklenemedi:", memberError);
        return;
      }

      const coalitionIds = [
        ...new Set((memberRows ?? []).map((row) => row.coalition_id)),
      ];

      if (coalitionIds.length === 0) {
        setTeamConversations([]);
        return;
      }

      const { data, error } = await supabase
        .from("coalitions")
        .select("id, name, project_id, projects(title)")
        .in("id", coalitionIds)
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

      // Bu sayfa yalnızca 1:1 (client<->freelancer) konuşmalar için.
      // Takım/koalisyon yayın mesajları (lib/coalitions/teamMessages.ts,
      // receiver_id = null, coalition_id dolu) ayrı bir bileşende
      // (TeamMessagesPanel) gösteriliyor. Onları burada da çekmek,
      // gönderenin kendi yayın mesajları için receiver_id = null'ı
      // "diğer kullanıcı" olarak seçip aşağıdaki profiles .in()
      // sorgusuna literal "null" göndermeye (22P02) yol açıyordu.
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
        console.error(
          "Mesajlar yüklenemedi:",
          error
        );
        setLoadError(
          "Mesajlar yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin."
        );
        setLoading(false);
        return;
      }

      const loadedMessages = (data ?? []) as Message[];

      setMessages(loadedMessages);

      /*
       * Mesajların bağlı olduğu tekliflerin proje isimleri VE
       * konuşmalardaki diğer kullanıcıların profilleri — ikisi de
       * yalnızca loadedMessages'a bağlı, birbirine bağlı değil,
       * bu yüzden paralel çekiliyor (art arda iki round trip yerine tek).
       */
      const proposalIds = [
        ...new Set(
          loadedMessages
            .map(
              (message) =>
                message.proposal_id
            )
            .filter(
              (id): id is string =>
                Boolean(id)
            )
        ),
      ];

      // receiver_id = null satırları artık sorgu seviyesinde dışlanıyor
      // (yukarıdaki .not("receiver_id", "is", null)); Boolean() filtresi
      // sadece ek bir güvenlik katmanı — profiles.in() sorgusuna hiçbir
      // zaman null/boş bir ID gitmediğinden emin olmak için.
      const otherUserIds = Array.from(
        new Set(
          loadedMessages
            .map((message) =>
              message.sender_id ===
              currentUserId
                ? message.receiver_id
                : message.sender_id
            )
            .filter((id): id is string => Boolean(id))
        )
      );

      /*
       * URL'den gelen client henüz mesaj
       * göndermemiş olsa bile profilini getir.
       */
      const urlUserId =
        searchParams.get("user");

      if (
        urlUserId &&
        urlUserId !== currentUserId &&
        !otherUserIds.includes(
          urlUserId
        )
      ) {
        otherUserIds.push(urlUserId);
      }

      const [proposalResult, profileResult] = await Promise.all([
        proposalIds.length > 0
          ? supabase
              .from("proposals")
              .select("id, projects(id, title, status)")
              .in("id", proposalIds)
          : Promise.resolve({ data: [], error: null }),
        otherUserIds.length > 0
          ? supabase
              .from("profiles")
              .select(
                "id, first_name, avatar_url, role"
              )
              .in("id", otherUserIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (!active) {
        return;
      }

      const { data: proposalRows, error: proposalError } = proposalResult;

      if (proposalError) {
        console.error(
          "Teklifler yüklenemedi:",
          proposalError.message,
          proposalError.code,
          proposalError.details,
          proposalError.hint
        );
      }

      const names: Record<string, string> = {};
      const ids: Record<string, string> = {};
      const statuses: Record<string, string | null> = {};

      for (const proposal of (proposalRows ?? []) as Array<{
        id: string;
        projects: unknown;
      }>) {
        const project = extractProject(proposal.projects);
        names[proposal.id] = project?.title ?? "Proje";
        if (project?.id) {
          ids[proposal.id] = project.id;
          statuses[proposal.id] = project.status;
        }
      }

      setProjectNames(names);
      setProjectIds(ids);
      setProjectStatuses(statuses);

      const { data: profileData, error: profileError } = profileResult;

      if (profileError) {
        console.error(
          "Profiller yüklenemedi:",
          profileError.message,
          profileError.code,
          profileError.details,
          profileError.hint
        );
      }

      setProfiles(
        (profileData ?? []) as Profile[]
      );

      setLoading(false);
    };

    void loadMessages();

    return () => {
      active = false;
    };
  }, [
    currentUserId,
    supabase,
    searchParams,
  ]);

  /*
   * REALTIME
   *
   * Client mesaj gönderdiğinde freelancer
   * ekranına otomatik düşer.
   */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let active = true;

    const channelName =
      `freelancer-messages-${currentUserId}`;



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

          const newMessage =
            payload.new as Message;

          /*
           * Bu mesaj freelancer ile ilgili değilse
           * hiçbir şey yapma.
           */
          if (
            newMessage.sender_id !==
              currentUserId &&
            newMessage.receiver_id !==
              currentUserId
          ) {

            return;
          }

          setMessages((current) => {
            if (
              current.some(
                (message) =>
                  message.id ===
                  newMessage.id
              )
            ) {

              return current;
            }



            return [
              ...current,
              newMessage,
            ];
          });

          /*
           * Karşı tarafı bul.
           */
          const otherUserId =
            newMessage.sender_id ===
            currentUserId
              ? newMessage.receiver_id
              : newMessage.sender_id;

          /*
           * Profilini getir.
           */
          const {
            data: profileData,
          } = await supabase
            .from("profiles")
            .select(
              "id, first_name, avatar_url, role"
            )
            .eq("id", otherUserId)
            .maybeSingle();

          if (
            !active ||
            !profileData
          ) {
            return;
          }

          setProfiles(
            (currentProfiles) => {
              if (
                currentProfiles.some(
                  (profile) =>
                    profile.id ===
                    profileData.id
                )
              ) {
                return currentProfiles;
              }

              return [
                ...currentProfiles,
                profileData as Profile,
              ];
            }
          );

          /*
           * Yeni mesaj bir teklife bağlıysa
           * proje adını getir.
           */
          if (
            newMessage.proposal_id &&
            !projectNames[
              newMessage.proposal_id
            ]
          ) {
            const {
              data: proposalData,
            } = await supabase
              .from("proposals")
              .select(
                "id, projects(id, title, status)"
              )
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

              setProjectNames(
                (current) => ({
                  ...current,
                  [newMessage.proposal_id!]:
                    project?.title ?? "Proje",
                })
              );

              if (project?.id) {
                setProjectIds((current) => ({
                  ...current,
                  [newMessage.proposal_id!]: project.id,
                }));
                setProjectStatuses((current) => ({
                  ...current,
                  [newMessage.proposal_id!]: project.status,
                }));
              }
            }
          }
        }
      )
      .subscribe();

    return () => {

      active = false;
      void supabase.removeChannel(
        channel
      );
    };
  }, [
    currentUserId,
    supabase,
    projectNames,
  ]);

  /*
   * KONUŞMALAR
   *
   * Aynı client ile farklı teklifler
   * ayrı konuşma olarak tutulur.
   */
  const conversations = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    const map =
      new Map<string, Conversation>();

    messages.forEach((message) => {
      const otherUserId =
        message.sender_id ===
        currentUserId
          ? message.receiver_id
          : message.sender_id;

      const profile = profiles.find(
        (item) =>
          item.id === otherUserId
      );

      if (!profile) {
        return;
      }

      /*
       * Freelancer sadece client konuşmalarını
       * görür.
       */
      if (
        profile.role &&
        profile.role !== "client"
      ) {
        return;
      }

      /*
       * proposal_id konuşmanın parçası.
       */
      const conversationKey = `${otherUserId}:${message.proposal_id ?? message.project_id ?? "legacy"}`;

      const existing =
        map.get(conversationKey);

      const unread =
        message.receiver_id ===
          currentUserId &&
        !message.read_at
          ? 1
          : 0;

      if (!existing) {
        map.set(conversationKey, {
          user: profile,
          messages: [message],
          lastMessage: message,
          unread,
          proposalId:
            message.proposal_id,
          projectId: message.project_id ?? (message.proposal_id ? projectIds[message.proposal_id] ?? null : null),
            projectTitle: message.project_id ? "Proje konuşması" : message.proposal_id ? projectNames[message.proposal_id] ?? "Proje" : "Genel konuşma",
        });
      } else {
        existing.messages.push(
          message
        );

        if (
          new Date(
            message.created_at
          ).getTime() >
          new Date(
            existing.lastMessage.created_at
          ).getTime()
        ) {
          existing.lastMessage =
            message;
        }

        existing.unread += unread;
      }
    });

    /*
     * URL'den belirli bir client + proposal
     * geldiyse ve henüz mesaj yoksa,
     * konuşmayı yine de gösterebilmek için
     * geçici conversation oluştur.
     */
    if (selectedUserId) {
      const selectedProfile =
        profiles.find(
          (profile) =>
            profile.id ===
            selectedUserId
        );

      const existingConversation =
        Array.from(
          map.values()
        ).some(
          (conversation) =>
            conversation.user.id ===
              selectedUserId &&
            conversation.proposalId === selectedProposalId && conversation.projectId === selectedProjectId
        );

      if (
        selectedProfile &&
        !existingConversation
      ) {
        map.set(
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
              content: "",
              proposal_id:
                selectedProposalId,
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
      map.values()
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
        search.toLocaleLowerCase(
          "tr-TR"
        );

      return conversations.filter(
        (conversation) => {
          const name = publicDisplayName(conversation.user, "").toLocaleLowerCase("tr-TR");

          const projectTitle =
            (
              conversation.projectTitle ??
              ""
            ).toLocaleLowerCase(
              "tr-TR"
            );

          return (
            name.includes(query) ||
            projectTitle.includes(
              query
            ) ||
            messageSearchText(conversation.lastMessage)
              .includes(query)
          );
        }
      );
    }, [conversations, search]);

  /*
   * SEÇİLİ PROFİL
   */
  const selectedProfile =
    profiles.find(
      (profile) =>
        profile.id ===
        selectedUserId
    );

  /*
   * SEÇİLİ KONUŞMANIN MESAJLARI
   *
   * Burada proposal_id kritik.
   *
   * Aynı client ile iki farklı teklif varsa
   * birbirine karışmaz.
   */
  const selectedMessages =
    messages.filter((message) => {
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

      if (!isConversation) {
        return false;
      }

      if (selectedProposalId) {
        return (
          message.proposal_id ===
          selectedProposalId
        );
      }

      if (selectedProjectId) return message.project_id === selectedProjectId && !message.proposal_id;
      return message.proposal_id === null && !message.project_id;
    });

  const hasExistingThread =
    selectedMessages.length > 0;

  /*
   * Yeni (mesajsız) bir konuşma için ön-yetki kontrolü — bkz. yukarı.
   * Zaten mesajı olan konuşmalar için hiçbir şey değişmez (mevcut
   * davranış korunur).
   */
  useEffect(() => {
    if (
      !currentUserId ||
      !selectedUserId ||
      hasExistingThread
    ) {
      return;
    }

    const key = `${selectedUserId}:${selectedProposalId ?? selectedProjectId ?? "none"}`;

    let cancelled = false;

    async function checkAuthorization() {
      if (selectedProposalId) {
        const { data: proposal } = await supabase
          .from("proposals")
          .select("id, project_id")
          .eq("id", selectedProposalId)
          .eq("freelancer_id", currentUserId)
          .maybeSingle();

        if (cancelled) return;

        if (!proposal) {
          setNewConversationCheck({ key, authorized: false });
          return;
        }

        const { data: project } = await supabase
          .from("projects")
          .select("client_id")
          .eq("id", proposal.project_id)
          .maybeSingle();

        if (cancelled) return;

        setNewConversationCheck({
          key,
          authorized: project?.client_id === selectedUserId,
        });
      } else if (selectedProjectId) {
        const [{ data: project }, { data: membership }, { data: invitation }] = await Promise.all([
          supabase.from("projects").select("id, client_id").eq("id", selectedProjectId).maybeSingle(),
          supabase.from("project_team_members").select("id").eq("project_id", selectedProjectId).eq("freelancer_id", currentUserId).eq("status", "active").maybeSingle(),
          supabase.from("project_team_invitations").select("id").eq("project_id", selectedProjectId).eq("freelancer_id", currentUserId).in("status", ["pending", "accepted"]).maybeSingle(),
        ]);
        if (!cancelled) setNewConversationCheck({
          key,
          authorized: project?.client_id === selectedUserId && Boolean(membership || invitation),
        });
      } else {
        setNewConversationCheck({ key, authorized: false });
      }
    }

    void checkAuthorization();

    return () => {
      cancelled = true;
    };
  }, [
    currentUserId,
    selectedUserId,
    selectedProposalId,
    selectedProjectId,
    hasExistingThread,
    supabase,
    canUseMessagingFeature,
  ]);

  const newConversationKey = selectedUserId
    ? `${selectedUserId}:${selectedProposalId ?? selectedProjectId ?? "none"}`
    : null;

  const canComposeToSelected =
    hasExistingThread ||
    (newConversationCheck?.key === newConversationKey &&
      newConversationCheck.authorized);

  /*
   * MESAJLARI OKUNDU YAP
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
            "Mesajlar okundu olarak işaretlenemedi:",
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
   * ----------------------------------------------------
   * GÜVENLİK: bu artık doğrudan `messages` tablosuna insert
   * yapmıyor. Gerçek yetkilendirme (proposal ilişkisi VEYA Pro
   * entitlement'ı) `/api/messages/send` route'unda server-side
   * kontrol edilir — `receiver_id`/`proposal_id` URL'den gelse bile
   * client-side hiçbir şeye güvenilmez. `canComposeToSelected` burada
   * sadece UI'ı erken durdurmak için var; asıl kapı sunucudadır.
   */
  const sendMessage = async () => {
    const text =
      messageText.trim();

    if (
      (!text && !attachmentFile) ||
      !currentUserId ||
      !selectedUserId ||
      sending ||
      !canComposeToSelected
    ) {
      return;
    }

    setSending(true);
    setSendError("");

    let attachment: { url: string; name: string; type: string } | null = null;

    if (attachmentFile) {
      const { data, error } = await uploadMessageAttachment(supabase, currentUserId, attachmentFile);
      if (error || !data) {
        setSendError(error ?? "Dosya yüklenemedi.");
        setSending(false);
        return;
      }
      attachment = data;
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

    if (!response.ok) {
      console.error(
        "Mesaj gönderilemedi:",
        responseData
      );

      // Mesaj kaydı başarısız olduysa, yüklenen dosya sahipsiz (orphan)
      // kalmasın diye geri silinir.
      if (attachment) {
        await deleteMessageAttachment(supabase, attachment.url);
      }

      setSendError(
        (responseData as { error?: string }).error ||
          "Mesaj gönderilemedi."
      );

      setSending(false);
      return;
    }

    const data = responseData.message as Message | undefined;



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
          data,
        ];
      });

      if (selectedUserId) {
        await notifyUsers(supabase, [
          {
            userId: selectedUserId,
            type: "message_received",
            title: "Yeni mesaj geldi",
            message: text.length > 80 ? `${text.slice(0, 80)}…` : text,
            link: `/client/messages?user=${encodeURIComponent(currentUserId ?? "")}`,
          },
        ]);
      }
    }

    setMessageText("");
    setAttachmentFile(null);
    setSending(false);
  };

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

  /*
   * YARDIMCI FONKSİYONLAR
   */
  const getFullName = (profile: Profile) => publicDisplayName(profile, "Kullanıcı");

  const getInitials = (profile: Profile) => displayInitial(profile);

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
      <PageHeader className={pageHeaderClass} title="Mesajlar" description="Müşteriler ve ekiplerle iletişimini yönet." />

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className={[shellStyles.messages,"flex w-full overflow-hidden rounded-2xl border border-gray-200 bg-white"].join(" ")}>
        {/* SOL PANEL — mobilde bir konuşma seçildiğinde gizlenir, sohbet paneli tam ekran olur */}
        <div
          className={`w-full shrink-0 flex-col border-gray-200 md:flex md:w-[340px] md:border-r ${
            (activeTab === "clients" && selectedUserId) ||
            (activeTab === "teams" && selectedCoalitionId)
              ? "hidden"
              : "flex"
          }`}
        >
          {/* TABLAR */}
          <div className="flex gap-2 border-b border-gray-200 p-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab("clients");
                setSelectedCoalitionId(null);
              }}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                activeTab === "clients"
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Müşteriler
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
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Ekipler
            </button>
          </div>

          {/* SEARCH */}
          <div className="p-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Mesajlarda ara..."
                className="w-full rounded-xl bg-gray-100 py-2.5 pl-9 pr-4 text-sm outline-none"
              />
            </div>
          </div>

          {/* CLIENTLER */}
          {activeTab ===
            "clients" && (
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-5 text-center text-sm text-gray-400">
                  Mesajlar yükleniyor...
                </div>
              ) : filteredConversations.length ===
                0 ? (
                <div className="flex h-full flex-col items-center justify-center p-5 text-center">
                  <MessageCircle
                    size={30}
                    className="mb-3 text-gray-300"
                  />

                  <p className="text-sm font-medium">
                    Henüz mesaj yok
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Bir müşteri ile iletişime geçtiğinde burada görünecek.
                  </p>
                </div>
              ) : (
                filteredConversations.map(
                  (conversation) => {
                    const profile =
                      conversation.user;

                    const isSelected =
                      selectedUserId ===
                        profile.id &&
                      selectedProposalId === conversation.proposalId && selectedProjectId === conversation.projectId;

                    return (
                      <button
                        type="button"
                        key={`${profile.id}-${conversation.proposalId ?? conversation.projectId ?? "legacy"}`}
                        onClick={() => {
                          setSelectedUserId(
                            profile.id
                          );

                          setSelectedProposalId(conversation.proposalId);
                          setSelectedProjectId(conversation.proposalId ? null : conversation.projectId);
                        }}
                        className={`flex w-full gap-3 border-b border-gray-100 p-4 text-left transition ${
                          isSelected
                            ? "bg-gray-50"
                            : "hover:bg-gray-50"
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
                            <h3 className="truncate text-sm font-semibold text-gray-900">
                              {getFullName(
                                profile
                              )}
                            </h3>

                            <span className="shrink-0 text-xs text-gray-400">
                              {formatTime(
                                conversation
                                  .lastMessage
                                  .created_at
                              )}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-gray-500">
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
                <div className="flex h-full flex-col items-center justify-center p-5 text-center">
                  <Users
                    size={32}
                    className="mb-3 text-gray-300"
                  />

                  <p className="text-sm font-medium text-gray-700">
                    Henüz ekip konuşması yok
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Bir ekip projesine dahil edildiğinde burada görünecek.
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
                    className={`flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left transition ${
                      selectedCoalitionId === conversation.coalitionId
                        ? "bg-gray-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-600)] text-white">
                      <Users size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-gray-900">
                        {conversation.name}
                      </h3>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {conversation.projectTitle ?? "Ekip mesajlaşması"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* CHAT */}
        <div
          className={`min-w-0 flex-1 flex-col md:flex ${
            (activeTab === "clients" && selectedUserId) ||
            (activeTab === "teams" && selectedCoalitionId)
              ? "flex"
              : "hidden"
          }`}
        >
          {activeTab === "teams" ? (
            selectedCoalitionId && currentUserId ? (
              <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-3 border-b border-gray-200 p-4 md:hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedCoalitionId(null)}
                    className="text-gray-500"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <span className="text-sm font-semibold text-gray-900">
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
              <div className="flex flex-1 items-center justify-center bg-gray-50 text-sm text-gray-400">
                Bir ekip konuşması seç.
              </div>
            )
          ) : !selectedProfile ? (
            <div className="flex flex-1 flex-col items-center justify-center bg-gray-50">
              <MessageCircle
                size={30}
                className="mb-3 text-gray-300"
              />

              <p className="text-sm font-medium">
                Bir konuşma seç
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Soldan bir müşteri seçerek mesajlaşmaya başla.
              </p>
            </div>
          ) : (
            <>
              {/* CHAT HEADER */}
              <div className="flex items-center gap-3 border-b border-gray-200 p-5">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  aria-label="Konuşma listesine dön"
                  className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 md:hidden"
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
                  <h2 className="font-semibold text-gray-900">
                    {getFullName(
                      selectedProfile
                    )}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {selectedProposalId ? (
                      <>
                        {projectIds[selectedProposalId] ? (
                          <Link
                            href={`${
                              projectStatuses[selectedProposalId] === "in_progress" ||
                              projectStatuses[selectedProposalId] === "completed"
                                ? `/freelancers/projects/${projectIds[selectedProposalId]}`
                                : `/freelancers/discover/${projectIds[selectedProposalId]}`
                            }?ref=messages&user=${encodeURIComponent(
                              selectedUserId ?? ""
                            )}&proposal=${encodeURIComponent(
                              selectedProposalId
                            )}`}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            {projectNames[selectedProposalId] ?? "Proje"}
                          </Link>
                        ) : (
                          projectNames[selectedProposalId] ?? "Proje"
                        )}{" "}
                        · Bu konuşma gönderdiğiniz teklif ile ilgilidir.
                      </>
                    ) : (
                      "Müşteri"
                    )}
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-start justify-end gap-2">
                  <ReportButton targetType="user" targetId={selectedProfile.id} label="Şikayet Et" />
                  <BlockUserButton targetUserId={selectedProfile.id} />
                </div>
              </div>

              {/* MESAJLAR */}
              <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-5">
                {selectedMessages.length ===
                0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
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
                            className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                              isMe
                                ? "bg-[var(--color-primary-600)] text-white"
                                : "border border-gray-200 bg-white text-gray-800"
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

              {/* MESAJ INPUT */}
              {!hasExistingThread &&
              (premiumLoading ||
                newConversationCheck?.key !==
                  newConversationKey) ? (
                <div className="border-t border-gray-200 p-5 text-center text-sm text-gray-400">
                  Konuşma kontrol ediliyor...
                </div>
              ) : !canComposeToSelected ? (
                <div className="border-t border-gray-200 bg-gray-50 p-5 text-center">
                  {selectedProposalId ? (
                    <p className="text-sm text-gray-500">
                      Bu konuşmaya mesaj gönderme yetkin yok.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        Teklif göndermeden önce mesajlaşmak Pro paketine özeldir.
                      </p>
                      <Link
                        href="/premium"
                        className="mt-2 inline-block text-sm font-medium text-gray-900 underline underline-offset-2"
                      >
                        Pro Planını İncele
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-200 p-5">
                  {sendError && (
                    <p className="mb-3 text-sm text-red-600">{sendError}</p>
                  )}
                  {attachmentError && (
                    <p className="mb-3 text-sm text-red-600">{attachmentError}</p>
                  )}
                  {attachmentFile && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700">
                      <FileText size={15} />
                      <span className="flex-1 truncate">{attachmentFile.name}</span>
                      <button
                        type="button"
                        aria-label="Ek dosyayı kaldır"
                        onClick={() => setAttachmentFile(null)}
                        className="text-gray-400 hover:text-gray-600"
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
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                    >
                      <Paperclip size={18} />
                    </button>

                    <input
                      value={messageText}
                      onChange={(event) =>
                        setMessageText(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                      placeholder="Mesaj yaz..."
                      disabled={sending}
                      className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-200"
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
                      className="flex items-center gap-2 rounded-xl bg-[var(--color-primary-600)] px-5 text-sm font-medium text-white disabled:opacity-40"
                    >
                      <Send size={16} />

                      {sending
                        ? "Gönderiliyor..."
                        : "Gönder"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function FreelancerMessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex items-center justify-center">
          <div className="text-sm text-gray-400">
            Mesajlar yükleniyor...
          </div>
        </main>
      }
    >
      <FreelancerMessagesContent />
    </Suspense>
  );
}
