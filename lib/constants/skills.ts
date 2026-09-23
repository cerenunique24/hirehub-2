/**
 * Proje oluşturma sırasında "Projede gerekli beceriler" alanında
 * seçilebilecek beceri/araç/yazılım adları.
 *
 * Farklı meslek alanlarından freelancer'lar için proje yayınlanabilmesi
 * amacıyla liste yazılım geliştirme/tasarım dışındaki meslekleri de
 * kapsayacak şekilde genişletilmiştir (mimarlık, mühendislik, veri
 * bilimi, pazarlama, yazarlık, ses/video, finans, hukuk, çeviri, İK,
 * satış, müşteri desteği, eğitim vb.) — bkz.
 * lib/matching/roleEligibility.ts'deki role family listesi.
 */
export const SKILLS = [
  // Development
  "UI Design",
  "UX Design",
  "Frontend",
  "Backend",
  "Full Stack",
  "React",
  "Next.js",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "PHP",
  "Python",
  "Java",
  ".NET",
  "Laravel",
  "WordPress",
  "Shopify",
  "Flutter",
  "React Native",
  "Swift",
  "Kotlin",
  "iOS Geliştirme",
  "Android Geliştirme",
  "Unity",
  "Unreal Engine",
  "AI",
  "Gemini",
  "OpenAI",
  "DevOps",
  "QA",

  // Design
  "Motion Design",
  "Brand Design",
  "Figma",
  "Adobe XD",
  "Prototipleme",
  "Design System",
  "Photoshop",
  "Illustrator",
  "InDesign",
  "CorelDRAW",
  "Procreate",
  "Wireframing",
  "User Research",
  "Ambalaj Tasarımı",
  "Tipografi",

  // Architecture & interior
  "AutoCAD",
  "Revit",
  "ArchiCAD",
  "SketchUp",
  "3ds Max",
  "Rhino",
  "Lumion",
  "V-Ray",
  "Twinmotion",
  "Enscape",
  "Peyzaj Mimarlığı",
  "Kentsel Tasarım",
  "İç Mekan Tasarımı",
  "Mobilya Tasarımı",

  // Engineering
  "SolidWorks",
  "CATIA",
  "ANSYS",
  "SAP2000",
  "Statik Proje",
  "PCB Tasarımı",
  "Gömülü Sistemler",
  "Elektrik Projesi",
  "Makine Projesi",

  // Data science
  "Veri Bilimi",
  "Makine Öğrenmesi",
  "Veri Analizi",
  "SQL",
  "Power BI",
  "Tableau",
  "İş Zekası",

  // Marketing
  "Copywriting",
  "SEO",
  "SEM",
  "Google Ads",
  "Meta Ads",
  "Sosyal Medya Yönetimi",
  "İçerik Pazarlama",
  "E-posta Pazarlama",
  "Influencer Pazarlama",
  "Marka Yönetimi",

  // Writing
  "İçerik Yazarlığı",
  "Metin Yazarlığı",
  "Teknik Yazarlık",
  "Senaryo Yazarlığı",
  "Editörlük",
  "Akademik Yazarlık",

  // Video / photo / animation
  "Video Kurgu",
  "Motion Graphics",
  "Fotoğrafçılık",
  "3D Modelleme",
  "3D Animasyon",
  "Blender",
  "Cinema 4D",
  "Maya",
  "ZBrush",
  "Oyun Tasarımı",

  // Voice / audio
  "Seslendirme",
  "Ses Mühendisliği",
  "Müzik Prodüksiyonu",
  "Dublaj",

  // Project management
  "Proje Yönetimi",
  "Scrum",
  "Agile Koçluk",
  "Ürün Yönetimi",

  // Finance & legal
  "Muhasebe",
  "Finansal Analiz",
  "Bütçe Yönetimi",
  "Hukuki Danışmanlık",
  "Sözleşme Hukuku",

  // Translation
  "Çeviri",
  "Yerelleştirme",

  // HR / sales / support / education
  "İşe Alım",
  "İnsan Kaynakları",
  "Satış Danışmanlığı",
  "İş Geliştirme",
  "Müşteri Hizmetleri",
  "Teknik Destek",
  "Eğitmenlik",
  "Uzaktan Eğitim Tasarımı",
] as const;
