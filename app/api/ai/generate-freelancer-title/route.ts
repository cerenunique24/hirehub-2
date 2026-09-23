import { cleanJsonOutput, generateJson, toSafeAiResponse } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

type FreelancerTitleInput = {
  categories?: string[];
  expertiseAreas?: string[];
  skills?: string[];
  experience?: string;
  about?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json(
        { error: "Uzmanlık başlığı oluşturmak için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      console.error("[CollaCrew AI] GEMINI_API_KEY eksik.");
      return Response.json(
        { error: "AI servisi yapılandırılmamış. GEMINI_API_KEY eksik." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as FreelancerTitleInput;

    const categories = Array.isArray(body.categories) ? body.categories : [];
    const expertiseAreas = Array.isArray(body.expertiseAreas) ? body.expertiseAreas : [];
    const skills = Array.isArray(body.skills) ? body.skills : [];
    const experience = body.experience?.trim() || "";
    const about = body.about?.trim() || "";

    if (about.length < 80) {
      return Response.json(
        { error: "Uzmanlık başlığı oluşturmak için Hakkında alanı en az 80 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const prompt = [
      "Sen CollaCrew freelancer profil oluşturma AI motorusun.",
      "",
      "Görevin freelancer'ın verdiği profil bilgilerini analiz ederek profesyonel, kısa ve anlaşılır bir uzmanlık başlığı oluşturmaktır.",
      "",
      "Bu başlık freelancer'ın profilinde ana uzmanlık başlığı olarak gösterilecektir.",
      "",
      "KURALLAR:",
      "- Sadece geçerli JSON döndür.",
      "- Markdown kullanma.",
      "- JSON dışında hiçbir metin yazma.",
      "- Başlığı Türkçe oluştur.",
      "- Başlık profesyonel ve doğal olmalı.",
      "- Gereksiz kelimeler kullanma.",
      "- Çok uzun başlık oluşturma.",
      "- En fazla yaklaşık 80 karakter kullan.",
      "- Freelancer'ın gerçekten sahip olduğu uzmanlıklara dayan.",
      "- Verilmeyen bir uzmanlığı uydurma.",
      "- Genel ve anlamsız başlıklardan kaçın.",
      "- 'Profesyonel', 'uzman', 'deneyimli' gibi boş sıfatları gereksiz yere kullanma.",
      "- Birden fazla uzmanlık varsa bunları mantıklı şekilde birleştir.",
      "",
      "ÖRNEKLER:",
      "",
      "UI/UX tasarım + Figma + mobil uygulama",
      "→ UI/UX & Mobil Ürün Tasarımcısı",
      "",
      "Grafik tasarım + marka tasarımı + Adobe Illustrator",
      "→ Marka ve Grafik Tasarımcısı",
      "",
      "Frontend + React + Next.js",
      "→ Frontend & React Geliştiricisi",
      "",
      "İç mimarlık + 3D + AutoCAD",
      "→ İç Mimar & 3D Görselleştirme Uzmanı",
      "",
      "Bu örnekleri doğrudan kopyalama.",
      "Freelancer'ın gerçek bilgilerine göre yeni bir başlık oluştur.",
      "",
      "FREELANCER BİLGİLERİ:",
      "",
      "Kategoriler:",
      categories.length > 0 ? categories.join(", ") : "Belirtilmedi",
      "",
      "Uzmanlık alanları:",
      expertiseAreas.length > 0 ? expertiseAreas.join(", ") : "Belirtilmedi",
      "",
      "Beceriler / Araçlar:",
      skills.length > 0 ? skills.join(", ") : "Belirtilmedi",
      "",
      "Deneyim:",
      experience || "Belirtilmedi",
      "",
      "Hakkında:",
      about,
      "",
      "JSON FORMATI:",
      "",
      "{",
      '  "title": "Freelancer uzmanlık başlığı"',
      "}",
    ].join("\n");

    const output = await generateJson(prompt, { temperature: 0.4 });
    const cleanedOutput = cleanJsonOutput(output);

    let parsed: { title?: string };

    try {
      parsed = JSON.parse(cleanedOutput) as { title?: string };
    } catch {
      console.error("[CollaCrew AI] Gemini geçersiz JSON döndürdü:", cleanedOutput.slice(0, 2000));
      return Response.json(
        { error: "AI geçerli bir uzmanlık başlığı formatı döndürmedi." },
        { status: 500 }
      );
    }

    const title = parsed.title?.trim();

    if (!title) {
      return Response.json({ error: "AI geçerli bir uzmanlık başlığı oluşturamadı." }, { status: 500 });
    }

    return Response.json({ title });
  } catch (error) {
    const { status, body: responseBody } = toSafeAiResponse(error, [
      "Uzmanlık başlığı oluşturmak için Hakkında alanı en az 80 karakter olmalıdır.",
    ]);
    return Response.json(responseBody, { status });
  }
}
