export const CLIENT_HELP_CATEGORIES = [
  {id:"project",label:"Proje / Oluşturma",description:"Proje oluşturma, yayınlama ve proje ayarları",icon:"project"},
  {id:"freelancer",label:"Freelancer / Teklif / Davet",description:"Freelancer bulma, teklif ve davet süreçleri",icon:"proposal"},
  {id:"delivery",label:"Teslim / Aşama / Ödeme",description:"Teslim, revizyon, aşama ve ödeme işlemleri",icon:"payment"},
  {id:"account",label:"Hesap / Teknik Sorun",description:"Profil, erişim ve teknik problemler",icon:"account"},
] as const;
export type ClientHelpCategory = typeof CLIENT_HELP_CATEGORIES[number]["id"];
/** Group stored article categories only; never generate questions or answers. */
export function clientHelpCategory(category: string): ClientHelpCategory {
  const text=category.toLocaleLowerCase("tr-TR");
  if (/freelancer|teklif|davet|ekip|eşleş/.test(text)) return "freelancer";
  if (/teslim|aşama|ödeme|revizyon|hakediş|workroom/.test(text)) return "delivery";
  if (/proje|başlangıç|yayın/.test(text)) return "project";
  return "account";
}
