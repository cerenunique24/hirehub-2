/** Shared recommendation policy; manual role editing is intentionally unrestricted. */
export const MAX_CORE_TEAM_ROLES = 5;

export const CORE_TEAM_POLICY = `
ÖNCELİK: MİNİMUM UYGULANABİLİR ÇEKİRDEK EKİP
Amaç mümkün olduğunca fazla uzmanlık önermek değil, projeyi başarıyla tamamlayabilecek en küçük ve en verimli çekirdek ekibi oluşturmaktır. Kullanıcıya büyük ekip satma.
1. Önce teslimatları ve sorumlulukları grupla.
2. Aynı profesyonelin gerçekçi biçimde üstlenebileceği sorumlulukları birleştir.
3. Minimum viable team oluştur; beceri ihtiyacını ayrı freelancer ihtiyacı olarak yorumlama.
4. Yalnızca bağımsız iş yükü, derin uzmanlık veya eşzamanlı çalışma gerçekten ayrı bir kişi gerektiriyorsa yeni rol ekle. Her reason bu ayrımın neden gerekli olduğunu açıklasın.
UI Designer + UX Designer + Product Designer varsayılan olarak üç ayrı rol değildir; kapsam uygunsa tek UI/UX Designer veya Product Designer altında birleştir.
Frontend ve basit backend işleri kapsam uygunsa Full Stack Developer altında birleştir. Karmaşık backend, güvenlik veya iş yükü gereksinimlerini gerçekçi olmayan biçimde tek kişiye yükleme.
Varsayılan hedefler (doldurulacak kota değil, kapsam üst sınırı rehberi): basit proje 1–2 rol; orta kapsam 2–3 rol; kompleks proje 3–4 rol; çok yüksek kapsam en fazla 5 çekirdek rol. Tek uzman yeterliyse tek rol seç.
requiredRoles ve roleDetails yalnızca çekirdek ekip olsun, her ikisinde de en fazla 5 rol bulunsun. Her rol bir diğerinden anlamlı biçimde ayrışsın.
5'ten fazla uzmanlık tespit edilirse bunları doğrudan çekirdek ekibe ekleme. Çekirdek sorumlulukları kaybetmeden birleştir; ek uzmanlıkları yalnızca gerçekten faydalıysa recommendations içinde ayrı, “İsteğe bağlı uzmanlık: [uzmanlık] — [hangi koşulda gerekli]” biçiminde değerlendir. Ek uzmanlık yoksa üretme.
İsteğe bağlı uzmanlıklar requiredRoles/roleDetails listelerine veya zorunlu becerilere sırf ekip büyütmek için taşınmamalı. Zorunlu proje sorumlulukları ve client'ın seçtiği beceriler uygun çekirdek rollerde korunmalı.
Son kontrolde her rol için “Bu sorumluluklar mevcut bir rol tarafından gerçekçi biçimde karşılanabilir mi?” diye değerlendir; evetse ayrı rol açma.
`;

/** Reject an oversized result instead of silently dropping roles or responsibilities. */
export function assertCoreTeamLimit(analysis: { requiredRoles: unknown[]; roleDetails: unknown[] }) {
  if (analysis.requiredRoles.length > MAX_CORE_TEAM_ROLES || analysis.roleDetails.length > MAX_CORE_TEAM_ROLES) {
    throw new Error("AI analizi en fazla 5 çekirdek rol içermelidir. Sorumluluklar birleştirilerek analiz yeniden hazırlanmalıdır.");
  }
}
