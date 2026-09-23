import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireFeatureAccess } from "@/lib/premium";
import { containsContactInfo, CONTACT_INFO_MESSAGE } from "@/lib/moderation/contactInfoFilter";
import { checkRateLimit, rateLimitKey, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

/**
 * POST /api/messages/pre-proposal
 *
 * "Teklif göndermeden önce eşleştiği projede client'a mesaj
 * gönderebilme" — Freelancer Pro'ya özel bir yetkidir (ürün kuralı
 * #5). Genel `messages` tablosunun INSERT RLS'i (sender_id =
 * auth.uid()) serbest olduğu için — teklif SONRASI mesajlaşma
 * herkese açık kalmalı — bu kısıtlama ancak dedicated bir API route
 * üzerinden, burada server-side olarak uygulanabilir. UI bu route'u
 * kullanmalı; ham `messages` insert'i teklif öncesi senaryo için
 * KULLANILMAMALI.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { projectId?: string; content?: string };
    const { projectId } = body;
    const content = (body.content ?? "").trim();

    if (!projectId || !content) {
      return NextResponse.json(
        { error: "Proje ve mesaj metni zorunludur." },
        { status: 400 }
      );
    }

    if (containsContactInfo(content)) {
      return NextResponse.json({ error: CONTACT_INFO_MESSAGE }, { status: 400 });
    }

    const supabase = await createClient();

    const access = await requireFeatureAccess(supabase, "pre_proposal_messaging");

    if (!access.ok) {
      return NextResponse.json(
        {
          error:
            access.context.userId === null
              ? "Mesaj göndermek için giriş yapmalısınız."
              : access.context.role !== "freelancer"
                ? "Bu özellik yalnızca freelancer hesapları için kullanılabilir."
                : "Teklif öncesi mesajlaşma Pro paketine özeldir.",
          requiredPlan: "pro",
        },
        { status: access.context.userId === null ? 401 : 403 }
      );
    }

    const freelancerId = access.context.userId!;

    const { ok: withinLimit } = await checkRateLimit(
      supabase,
      rateLimitKey("messages_pre_proposal", freelancerId),
      10,
      600
    );

    if (!withinLimit) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, client_id, status")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Proje bulunamadı." }, { status: 404 });
    }

    const { data: clientProfile, error: clientError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", project.client_id)
      .eq("role", "client")
      .maybeSingle();

    if (clientError || !clientProfile) {
      return NextResponse.json({ error: "Bu projenin client'ı bulunamadı." }, { status: 404 });
    }

    const { data: existingProposal } = await supabase
      .from("proposals")
      .select("id")
      .eq("project_id", projectId)
      .eq("freelancer_id", freelancerId)
      .maybeSingle();

    if (existingProposal) {
      return NextResponse.json(
        { error: "Bu projeye zaten teklif gönderdin — mesajlaşma artık teklif üzerinden devam ediyor." },
        { status: 409 }
      );
    }

    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        proposal_id: null,
        sender_id: freelancerId,
        receiver_id: project.client_id,
        content,
        is_read: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[pre-proposal message] insert error:", insertError);
      return NextResponse.json(
        { error: "Mesaj gönderilemedi." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: message.id });
  } catch (error) {
    console.error("[pre-proposal message] unexpected error:", error);
    return NextResponse.json(
      { error: "Mesaj gönderilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
