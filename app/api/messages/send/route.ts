import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { canUseFeature, getUserAccessContext } from "@/lib/premium";
import { containsContactInfo, CONTACT_INFO_MESSAGE } from "@/lib/moderation/contactInfoFilter";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      receiverId?: string;
      proposalId?: string | null;
      projectId?: string | null;
      coalitionId?: string | null;
      content?: string;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
      attachmentType?: string | null;
    };

    const receiverId = body.receiverId || null;
    const proposalId = body.proposalId || null;
    const projectId = body.projectId || null;
    const coalitionId = body.coalitionId || null;
    const content = (body.content ?? "").trim();
    const attachmentUrl = body.attachmentUrl || null;
    const attachmentName = body.attachmentName || null;
    const attachmentType = body.attachmentType || null;

    if ((!content && !attachmentUrl) || (coalitionId && (receiverId || proposalId || attachmentUrl || projectId))) {
      return NextResponse.json({ error: "Mesaj içeriği veya geçerli mesaj ilişkisi gerekli." }, { status: 400 });
    }

    if (content && containsContactInfo(content)) {
      return NextResponse.json({ error: CONTACT_INFO_MESSAGE }, { status: 400 });
    }

    const supabase = await createClient();
    const context = await getUserAccessContext(supabase);
    if (!context.userId) {
      return NextResponse.json({ error: "Mesaj göndermek için giriş yapmalısınız." }, { status: 401 });
    }
    if (context.role !== "client" && context.role !== "freelancer") {
      return NextResponse.json({ error: "Bu hesap türü mesaj gönderemez." }, { status: 403 });
    }

    const senderId = context.userId;
    const { ok: withinLimit } = await checkRateLimit(supabase, rateLimitKey("messages_send", senderId), 30, 300);
    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    if (attachmentUrl && (!attachmentUrl.startsWith(`${senderId}/`) || attachmentUrl.includes("..") || attachmentUrl.includes("\\"))) {
      return NextResponse.json({ error: "Bu ek dosya üzerinde yetkin yok." }, { status: 403 });
    }

    if (coalitionId) {
      const { data: coalition } = await supabase
        .from("coalitions")
        .select("id, project_id")
        .eq("id", coalitionId)
        .maybeSingle();
      if (!coalition) return NextResponse.json({ error: "Ekip konuşması bulunamadı." }, { status: 404 });

      const [{ data: membership }, { data: project }] = await Promise.all([
        supabase.from("coalition_members").select("user_id").eq("coalition_id", coalitionId).eq("user_id", senderId).eq("status", "active").maybeSingle(),
        coalition.project_id
          ? supabase.from("projects").select("id, client_id").eq("id", coalition.project_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!membership && project?.client_id !== senderId) {
        return NextResponse.json({ error: "Bu ekip konuşmasına mesaj gönderme yetkin yok." }, { status: 403 });
      }

      const { data: message, error } = await supabase.from("messages").insert({
        sender_id: senderId,
        receiver_id: null,
        proposal_id: null,
        coalition_id: coalitionId,
        content: content || null,
      }).select().single();
      if (error) return insertError(error);
      return NextResponse.json({ message });
    }

    if (!receiverId || !/^[0-9a-f-]{36}$/i.test(receiverId)) {
      return NextResponse.json({ error: "Geçerli bir alıcı gerekli." }, { status: 400 });
    }

    const receiverRole = context.role === "client" ? "freelancer" : "client";
    const { data: receiver } = await supabase.from("profiles")
      .select("id").eq("id", receiverId).eq("role", receiverRole).maybeSingle();
    if (!receiver) return NextResponse.json({ error: "Alıcı bulunamadı." }, { status: 404 });

    let scopedProjectId = projectId;
    if (proposalId) {
      const { data: proposal } = await supabase
        .from("proposals").select("id, project_id, freelancer_id").eq("id", proposalId).maybeSingle();
      if (!proposal) return NextResponse.json({ error: "Teklif bulunamadı." }, { status: 403 });

      const { data: project } = await supabase
        .from("projects").select("id, client_id").eq("id", proposal.project_id).maybeSingle();
      const relationValid = context.role === "freelancer"
        ? proposal.freelancer_id === senderId && project?.client_id === receiverId
        : project?.client_id === senderId && proposal.freelancer_id === receiverId;
      if (!relationValid || (projectId && projectId !== proposal.project_id)) {
        return NextResponse.json({ error: "Bu teklif seçilen kullanıcı ve projeyle ilişkili değil." }, { status: 403 });
      }
      scopedProjectId = null;
    } else if (projectId) {
      const { data: project } = await supabase
        .from("projects").select("id, client_id, status").eq("id", projectId).maybeSingle();
      if (!project) return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });

      if (context.role === "freelancer") {
        if (project.client_id !== receiverId || project.status !== "open" || !canUseFeature(context, "pre_proposal_messaging")) {
          return NextResponse.json({ error: "Bu proje için teklif öncesi mesaj gönderme yetkin yok." }, { status: 403 });
        }
        const { data: proposal } = await supabase.from("proposals").select("id")
          .eq("project_id", projectId).eq("freelancer_id", senderId).maybeSingle();
        if (proposal) return NextResponse.json({ error: "Bu projeye teklif gönderdin; mesajı teklif üzerinden sürdür." }, { status: 409 });
      } else {
        const [{ data: membership }, { data: invitation }, { data: proposal }] = await Promise.all([
          supabase.from("project_team_members").select("id").eq("project_id", projectId).eq("freelancer_id", receiverId).eq("status", "active").maybeSingle(),
          supabase.from("project_team_invitations").select("id").eq("project_id", projectId).eq("freelancer_id", receiverId).in("status", ["pending", "accepted"]).maybeSingle(),
          supabase.from("proposals").select("id").eq("project_id", projectId).eq("freelancer_id", receiverId).maybeSingle(),
        ]);
        if (project.client_id !== senderId || (!membership && !invitation && !proposal)) {
          return NextResponse.json({ error: "Bu freelancer seçilen projeyle ilişkili değil." }, { status: 403 });
        }
      }
    } else {
      // Keep legacy unscoped threads replyable; never create a new arbitrary pair.
      const { error: projectScopeColumnError } = await supabase.from("messages").select("project_id").limit(0);
      let legacyQuery = supabase.from("messages")
        .select("id, sender_id, receiver_id, proposal_id, coalition_id")
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
        .is("proposal_id", null).is("coalition_id", null);
      if (!projectScopeColumnError) legacyQuery = legacyQuery.is("project_id", null);
      const { data: existingMessages } = await legacyQuery.limit(1);
      const hasLegacyThread = (existingMessages ?? []).some((message) =>
        (message.sender_id === senderId && message.receiver_id === receiverId)
        || (message.sender_id === receiverId && message.receiver_id === senderId));
      if (!hasLegacyThread) {
        return NextResponse.json({ error: "Yeni mesaj için geçerli proje veya teklif bağlamı gerekli." }, { status: 403 });
      }
    }

    const messageInsert: Record<string, unknown> = {
      sender_id: senderId,
      receiver_id: receiverId,
      proposal_id: proposalId,
      content: content || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
    };
    if (scopedProjectId && !proposalId) messageInsert.project_id = scopedProjectId;
    const { data: message, error } = await supabase.from("messages").insert(messageInsert).select().single();

    if (error) return insertError(error);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("[messages/send] unexpected error:", error);
    return NextResponse.json({ error: "Mesaj gönderilirken bir hata oluştu." }, { status: 500 });
  }
}

function insertError(error: { code?: string; message?: string }) {
  console.error("[messages/send] insert error:", error);
  if (error.code === "42501") {
    return NextResponse.json({ error: "Bu kullanıcıyla mesajlaşamazsın. Kullanıcı engellenmiş olabilir." }, { status: 403 });
  }
  if (error.code === "PGRST204" || error.code === "42703") {
    return NextResponse.json({ error: "Proje kapsamlı mesajlaşma için veritabanı şeması güncellenmeli." }, { status: 503 });
  }
  if (error.code === "P0001") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Mesaj gönderilemedi." }, { status: 500 });
}
