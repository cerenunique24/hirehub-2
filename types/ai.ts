export type ProjectLifecycleStage =
  | "draft"
  | "analyzing"
  | "analyzed"
  | "reviewing"
  | "matching"
  | "crew_review"
  | "ready_to_publish"
  | "published";

export interface ProjectBrief {
  title: string;
  description: string;
  goals?: string;
  context?: string;
  requirements?: string;
  budget: string;
  deadline: string;

  /**
   * Client'ın projede çalışacak kişilerden beklediği
   * genel uzmanlık alanları (rol analizinden önce seçilir).
   */
  expertise?: string[];

  /**
   * Client'ın projede çalışacak kişilerden beklediği
   * genel beceriler (rol analizinden önce seçilir).
   *
   * AI bu listeyi roleDetails içindeki ilgili rollere
   * dağıtmakla yükümlüdür.
   */
  skills?: string[];
}

/**
 * AI tarafından proje içindeki her rol için oluşturulan detaylı analiz.
 *
 * Örneğin:
 * UI/UX Designer
 * - neden gerekli
 * - hangi işleri yapacak
 * - hangi yeteneklere sahip olmalı
 * - hangi yetenekler tercih sebebi
 */
export interface ProjectRoleAnalysis {
  role: string;
  reason: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  estimatedDuration?: string;
  aiBudgetMin?: number;
  aiBudgetMax?: number;
}

export interface WorkingModelRecommendation {
  type: "single" | "team";
  label: string;
  estimatedDuration: string;
  estimatedBudgetMin?: number;
  estimatedBudgetMax?: number;
  roles: string[];
}

export interface ProjectAnalysis {
  /**
   * Projenin kısa ve anlaşılır özeti.
   */
  summary: string;

  /**
   * Projenin ana kategorisi.
   */
  category: string;

  /**
   * Projenin genel karmaşıklığı.
   */
  complexity: "Low" | "Medium" | "High";

  /**
   * Projenin ana hedefleri.
   */
  goals: string[];

  /**
   * Projede açıkça belirtilen veya analizden çıkarılan
   * temel gereksinimler.
   */
  keyRequirements: string[];

  /**
   * Projenin ihtiyaç duyduğu genel uzmanlık alanları.
   */
  requiredExpertise: string[];

  /**
   * Projede ihtiyaç duyulan rollerin isimleri.
   *
   * Bu alan geriye dönük uyumluluk için korunuyor.
   * Detaylı rol bilgileri roleDetails alanında tutuluyor.
   */
  requiredRoles: string[];

  /**
   * Projede genel olarak ihtiyaç duyulan beceriler.
   *
   * Bu alan geriye dönük uyumluluk için korunuyor.
   * Freelancer eşleştirmede mümkün olduğunca
   * roleDetails içindeki role özel beceriler kullanılacak.
   */
  requiredSkills: string[];

  /**
   * Her rolün neden gerektiği, sorumlulukları ve
   * role özel becerileri.
   */
  roleDetails: ProjectRoleAnalysis[];

  /**
   * Proje sonunda ortaya çıkması beklenen teslimatlar.
   */
  deliverables: string[];

  /**
   * AI tarafından tahmin edilen proje süresi.
   */
  estimatedTimeline: string;

  /**
   * Proje bütçesi.
   *
   * Kullanıcı bütçe verdiyse bu bilgi temel alınmalı,
   * verilmediyse "Belirtilmedi" gibi bir değer kullanılabilir.
   */
  estimatedBudget: string;

  /**
   * Önerilen toplam ekip büyüklüğü.
   */
  recommendedTeamSize: number;

  /**
   * AI'nın projeyle ilgili önemli gözlemleri.
   */
  insights: string;

  /**
   * Müşteriye yönelik proje önerileri.
   */
  recommendations: string[];

  /**
   * Projede dikkat edilmesi gereken noktalar.
   */
  considerations: string[];

  /** Suggestions only: the client can retain the default recommendation. */
  workingModels?: WorkingModelRecommendation[];
}

/**
 * Freelancer eşleştirme sonucu.
 */
export interface TalentMatchFreelancer {
  userId: string;
  name: string;
  avatar?: string;
  skills: string[];
  matchScore: number;
  reasons: string[];
}

/**
 * Eski koalisyon eşleştirme yapısı.
 *
 * Yeni proje oluşturma akışında kullanılmıyor,
 * ancak mevcut kodun kırılmaması için korunuyor.
 */
export interface TalentMatchCoalition {
  coalitionId: string;
  name: string;
  skills: string[];
  matchScore: number;
  reasons: string[];
  memberCount: number;
}

export interface TalentMatchingResult {
  recommendedFreelancers: TalentMatchFreelancer[];
  recommendedCoalitions: TalentMatchCoalition[];
}

/**
 * Bir ekip üyesi için AI önerisi.
 *
 * Yeni freelancer eşleştirme akışında doğrudan
 * otomatik ekip oluşturmak yerine ileride kullanılabilir.
 */
export interface CrewMemberRecommendation {
  role: string;
  userId?: string;
  name: string;
  skills: string[];
  reason: string;
}

export interface CrewRecommendation {
  members: CrewMemberRecommendation[];
  totalEstimatedCost: string;
  estimatedDuration: string;
  summary: string;
  confidence: number;
}

export interface ProfileAnalysis {
  strength: number;
  missingFields: string[];
  skillInsights: string[];
  suggestions: string[];
}

export interface ProjectRecommendation {
  projectId: string;
  title: string;
  matchScore: number;
  reasons: string[];
  relevantSkills: string[];
  budget: number;
}

export interface ProposalImprovement {
  suggestions: string[];
  improvedCoverLetter: string;
  strengths: string[];
  weaknesses: string[];
}

export interface AIRecommendation {
  projectId: string;
  recommendation: "single" | "coalition";
  confidence: number;
  suggestedRoles: string[];
  suggestedSkills: string[];
  estimatedBudget: number;
  estimatedDuration: number;
  summary: string;
}

/**
 * CollaCrew proje oluşturma sürecinin genel state'i.
 */
export interface CollaCrewProjectState {
  stage: ProjectLifecycleStage;
  brief: ProjectBrief;
  aiAnalysis?: ProjectAnalysis;
  userAnalysis?: ProjectAnalysis;
  talentMatching?: TalentMatchingResult;
  crewRecommendation?: CrewRecommendation;
  approvedCrew?: CrewMemberRecommendation[];
}
