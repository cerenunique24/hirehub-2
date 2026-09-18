"use client";

import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  X,
  Upload,
  Image as ImageIcon,
  Pencil,
  Save,
  Camera,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  skills: string[] | null;
  city: string | null;
  hourly_rate: number | null;
  availability: string | null;
  experience: string | null;
  expertise: string[] | null;
  work_types: string[] | null;
  languages: string[] | null;
  phone: string | null;
};

type PortfolioItem = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  skills: string[] | null;
};

type Experience = {
  id: string;
  company_name: string;
  position: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
};

const PORTFOLIO_CATEGORIES = [
  "UI/UX Tasarım",
  "Web Tasarım",
  "Mobil Uygulama",
  "Ürün Tasarımı",
  "Web Geliştirme",
  "Marka Tasarımı",
  "Grafik Tasarım",
  "E-Ticaret",
  "Yazılım",
  "Dijital Pazarlama",
  "İçerik Üretimi",
  "3D Tasarım",
  "Mimari & İç Mekân",
  "Diğer",
];

const SKILL_OPTIONS = [
  "Figma",
  "Adobe Photoshop",
  "Adobe Illustrator",
  "Adobe XD",
  "Adobe InDesign",
  "Sketch",
  "Framer",
  "Webflow",
  "FigJam",
  "Miro",
  "Canva",
  "UI Design",
  "UX Design",
  "UI/UX Design",
  "UX Research",
  "User Research",
  "Wireframing",
  "Prototyping",
  "Design System",
  "Interaction Design",
  "Visual Design",
  "Product Design",
  "Responsive Design",
  "Usability Testing",
  "HTML",
  "CSS",
  "JavaScript",
  "React",
  "Next.js",
  "Tailwind CSS",
  "WordPress",
  "Shopify",
  "Brand Identity",
  "Logo Design",
  "Typography",
  "Motion Design",
  "3D Design",
  "Blender",
  "AutoCAD",
  "Rhino",
  "SketchUp",
];

const EXPERTISE_OPTIONS = [
  "UI/UX Tasarım",
  "Product Design",
  "UX Research",
  "Web Tasarım",
  "Mobil Uygulama Tasarımı",
  "Design System",
  "Interaction Design",
  "Visual Design",
  "Brand Design",
  "Grafik Tasarım",
  "Frontend Geliştirme",
  "Web Geliştirme",
  "3D Tasarım",
];

const WORK_TYPE_OPTIONS = [
  "Uzaktan",
  "Hibrit",
  "Ofisten",
];

const LANGUAGE_OPTIONS = [
  "Türkçe",
  "İngilizce",
  "Almanca",
  "Fransızca",
  "İspanyolca",
  "İtalyanca",
  "Hollandaca",
];

const AVAILABILITY_OPTIONS = [
  "Tamamen müsait",
  "Kısmen müsait",
  "Yeni projelere kapalı",
];

const EXPERIENCE_OPTIONS = [
  "Yeni başlayan",
  "1-2 yıl",
  "3-5 yıl",
  "5-8 yıl",
  "8+ yıl",
];

const CROP_SIZE = 320;

function getSupabaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      message: String(error || "Bilinmeyen hata"),
      details: null,
      hint: null,
      code: null,
    };
  }

  const supabaseError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return {
    message: supabaseError.message ?? null,
    details: supabaseError.details ?? null,
    hint: supabaseError.hint ?? null,
    code: supabaseError.code ?? null,
  };
}

export default function ProfilePage() {
  const supabase = createClient();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showPortfolioForm, setShowPortfolioForm] =
    useState(false);
  const [showExperienceForm, setShowExperienceForm] =
    useState(false);

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);
  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    title: "",
    bio: "",
    city: "",
    phone: "",
    hourly_rate: "",
    availability: "",
    experience: "",
    skills: [] as string[],
    expertise: [] as string[],
    work_types: [] as string[],
    languages: [] as string[],
  });

  const [profileSkillSearch, setProfileSkillSearch] =
    useState("");

  const [
    showProfileSkillSuggestions,
    setShowProfileSkillSuggestions,
  ] = useState(false);

  const [expertiseSearch, setExpertiseSearch] = useState("");
  const [
    showExpertiseSuggestions,
    setShowExpertiseSuggestions,
  ] = useState(false);

  const [portfolioForm, setPortfolioForm] = useState({
    title: "",
    category: "",
    description: "",
    skills: [] as string[],
  });

  const [skillSearch, setSkillSearch] = useState("");
  const [showSkillSuggestions, setShowSkillSuggestions] =
    useState(false);

  const [experienceForm, setExperienceForm] = useState({
    company_name: "",
    position: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  /*
   * AVATAR CROP
   */

  const [showAvatarCrop, setShowAvatarCrop] =
    useState(false);

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);

  const [cropScale, setCropScale] = useState(1);

  const [cropOffset, setCropOffset] = useState({
    x: 0,
    y: 0,
  });

  const [cropBaseScale, setCropBaseScale] =
    useState(1);

  const [cropImageSize, setCropImageSize] =
    useState({
      width: 0,
      height: 0,
    });

  const [isDraggingCrop, setIsDraggingCrop] =
    useState(false);

  const cropDragStart = useRef({
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
  });

  /*
   * PROFİLİ YÜKLE
   */

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "AUTH ERROR:",
            getSupabaseErrorDetails(authError)
          );
        }

        if (!user) {
          setLoading(false);
          return;
        }

        const profileResult = await supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, avatar_url, title, bio, skills, city, hourly_rate, availability, experience, expertise, work_types, languages, phone"
          )
          .eq("id", user.id)
          .single();

        if (profileResult.error) {
          console.error(
            "PROFILE ERROR:",
            getSupabaseErrorDetails(
              profileResult.error
            )
          );
        }

        const portfolioResult = await supabase
          .from("portfolio_items")
          .select(
            "id, title, category, description, image_url, skills"
          )
          .eq("freelancer_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (portfolioResult.error) {
          const portfolioError =
            getSupabaseErrorDetails(
              portfolioResult.error
            );

          console.error(
            "PORTFOLIO ERROR:",
            portfolioError
          );

          console.error(
            "PORTFOLIO ERROR RAW:",
            JSON.stringify(
              portfolioError,
              null,
              2
            )
          );

          setPortfolio([]);
        } else {
          setPortfolio(
            (portfolioResult.data || []) as PortfolioItem[]
          );
        }

        const experienceResult = await supabase
          .from("experiences")
          .select(
            "id, company_name, position, start_date, end_date, description"
          )
          .eq("freelancer_id", user.id)
          .order("start_date", {
            ascending: false,
          });

        if (experienceResult.error) {
          console.error(
            "EXPERIENCE ERROR:",
            getSupabaseErrorDetails(
              experienceResult.error
            )
          );

          setExperiences([]);
        } else {
          setExperiences(
            (experienceResult.data || []) as Experience[]
          );
        }

        const profileData =
          profileResult.data as Profile | null;

        setProfile(profileData);

        if (profileData) {
          setProfileForm({
            first_name:
              profileData.first_name || "",
            last_name:
              profileData.last_name || "",
            title:
              profileData.title || "",
            bio:
              profileData.bio || "",
            city:
              profileData.city || "",
            phone:
              profileData.phone || "",
            hourly_rate:
              profileData.hourly_rate !== null &&
              profileData.hourly_rate !== undefined
                ? String(profileData.hourly_rate)
                : "",
            availability:
              profileData.availability || "",
            experience:
              profileData.experience || "",
            skills:
              profileData.skills || [],
            expertise:
              profileData.expertise || [],
            work_types:
              profileData.work_types || [],
            languages:
              profileData.languages || [],
          });
        }
      } catch (error) {
        console.error(
          "PROFILE PAGE ERROR:",
          getSupabaseErrorDetails(error)
        );
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, []);

  /*
   * PROFİL FOTOĞRAFI
   */

  const openAvatarPicker = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Lütfen bir görsel dosyası seçin.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(
        "Profil fotoğrafı en fazla 5 MB olabilir."
      );
      event.target.value = "";
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    const previewUrl =
      URL.createObjectURL(file);

    const image = new Image();

    image.onload = () => {
      const baseScale = Math.max(
        CROP_SIZE / image.naturalWidth,
        CROP_SIZE / image.naturalHeight
      );

      const displayWidth =
        image.naturalWidth * baseScale;

      const displayHeight =
        image.naturalHeight * baseScale;

      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      setCropBaseScale(baseScale);
      setCropScale(1);

      setCropImageSize({
        width: displayWidth,
        height: displayHeight,
      });

      setCropOffset({
        x:
          (CROP_SIZE - displayWidth) /
          2,
        y:
          (CROP_SIZE - displayHeight) /
          2,
      });

      setShowAvatarCrop(true);
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      alert("Fotoğraf okunamadı.");
    };

    image.src = previewUrl;

    event.target.value = "";
  };

  const closeAvatarCrop = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setShowAvatarCrop(false);
    setAvatarFile(null);
    setAvatarPreview(null);

    setCropScale(1);

    setCropOffset({
      x: 0,
      y: 0,
    });

    setCropImageSize({
      width: 0,
      height: 0,
    });
  };

  const getCurrentCropSize = () => {
    const scale =
      cropBaseScale * cropScale;

    return {
      width:
        cropImageSize.width *
        cropScale,
      height:
        cropImageSize.height *
        cropScale,
      scale,
    };
  };

  const clampCropOffset = (
    x: number,
    y: number,
    scale = cropScale
  ) => {
    const width =
      cropImageSize.width * scale;

    const height =
      cropImageSize.height * scale;

    const minX = CROP_SIZE - width;
    const minY = CROP_SIZE - height;

    return {
      x: Math.min(
        0,
        Math.max(minX, x)
      ),
      y: Math.min(
        0,
        Math.max(minY, y)
      ),
    };
  };

  const handleCropMouseDown = (
    event: ReactMouseEvent<HTMLDivElement>
  ) => {
    if (!avatarPreview) return;

    setIsDraggingCrop(true);

    cropDragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: cropOffset.x,
      offsetY: cropOffset.y,
    };
  };

  const handleCropMouseMove = (
    event: ReactMouseEvent<HTMLDivElement>
  ) => {
    if (!isDraggingCrop) return;

    const deltaX =
      event.clientX -
      cropDragStart.current.x;

    const deltaY =
      event.clientY -
      cropDragStart.current.y;

    const nextX =
      cropDragStart.current.offsetX +
      deltaX;

    const nextY =
      cropDragStart.current.offsetY +
      deltaY;

    setCropOffset(
      clampCropOffset(
        nextX,
        nextY
      )
    );
  };

  const handleCropMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleCropZoom = (
    value: number
  ) => {
    const nextScale = Math.min(
      3,
      Math.max(1, value)
    );

    const current =
      getCurrentCropSize();

    const centerX =
      CROP_SIZE / 2 -
      (cropOffset.x +
        current.width / 2);

    const centerY =
      CROP_SIZE / 2 -
      (cropOffset.y +
        current.height / 2);

    const ratio =
      nextScale / cropScale;

    const nextWidth =
      cropImageSize.width *
      nextScale;

    const nextHeight =
      cropImageSize.height *
      nextScale;

    const nextOffsetX =
      CROP_SIZE / 2 -
      (CROP_SIZE / 2 - centerX) *
        ratio -
      nextWidth / 2;

    const nextOffsetY =
      CROP_SIZE / 2 -
      (CROP_SIZE / 2 - centerY) *
        ratio -
      nextHeight / 2;

    setCropScale(nextScale);

    setCropOffset(
      clampCropOffset(
        nextOffsetX,
        nextOffsetY,
        nextScale
      )
    );
  };

  const createCroppedAvatar =
    async (): Promise<Blob | null> => {
      if (
        !avatarPreview ||
        !cropImageRef.current
      ) {
        return null;
      }

      const image =
        cropImageRef.current;

      const outputSize = 512;

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width = outputSize;
      canvas.height = outputSize;

      const context =
        canvas.getContext("2d");

      if (!context) {
        return null;
      }

      const displayScale =
        cropBaseScale * cropScale;

      const sourceX = Math.max(
        0,
        -cropOffset.x /
          displayScale
      );

      const sourceY = Math.max(
        0,
        -cropOffset.y /
          displayScale
      );

      const sourceSize =
        CROP_SIZE / displayScale;

      const maxSourceSize =
        Math.min(
          image.naturalWidth -
            sourceX,
          image.naturalHeight -
            sourceY
        );

      const finalSourceSize =
        Math.min(
          sourceSize,
          maxSourceSize
        );

      context.clearRect(
        0,
        0,
        outputSize,
        outputSize
      );

      context.drawImage(
        image,
        sourceX,
        sourceY,
        finalSourceSize,
        finalSourceSize,
        0,
        0,
        outputSize,
        outputSize
      );

      return new Promise(
        (resolve) => {
          canvas.toBlob(
            (blob) =>
              resolve(blob),
            "image/jpeg",
            0.9
          );
        }
      );
    };

  const saveAvatar = async () => {
    if (
      !profile ||
      !avatarFile
    ) {
      return;
    }

    setSaving(true);

    try {
      const croppedBlob =
        await createCroppedAvatar();

      if (!croppedBlob) {
        alert(
          "Fotoğraf kırpılamadı."
        );
        return;
      }

      const filePath = `${profile.id}/${crypto.randomUUID()}.jpg`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("avatars")
        .upload(
          filePath,
          croppedBlob,
          {
            cacheControl: "3600",
            contentType:
              "image/jpeg",
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "AVATAR UPLOAD ERROR:",
          getSupabaseErrorDetails(
            uploadError
          )
        );

        alert(
          "Profil fotoğrafı yüklenemedi."
        );

        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(
          filePath
        );

      const oldAvatarUrl =
        profile.avatar_url;

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .update({
          avatar_url:
            publicUrl,
        })
        .eq(
          "id",
          profile.id
        )
        .select(
          "id, first_name, last_name, avatar_url, title, bio, skills, city, hourly_rate, availability, experience, expertise, work_types, languages, phone"
        )
        .single();

      if (error) {
        console.error(
          "AVATAR PROFILE UPDATE ERROR:",
          getSupabaseErrorDetails(
            error
          )
        );

        await supabase.storage
          .from("avatars")
          .remove([
            filePath,
          ]);

        alert(
          "Profil fotoğrafı kaydedilemedi."
        );

        return;
      }

      setProfile(
        data as Profile
      );

      if (
        oldAvatarUrl &&
        oldAvatarUrl.includes(
          "/storage/v1/object/public/avatars/"
        )
      ) {
        const marker =
          "/storage/v1/object/public/avatars/";

        const index =
          oldAvatarUrl.indexOf(
            marker
          );

        if (index !== -1) {
          const oldPath =
            decodeURIComponent(
              oldAvatarUrl.substring(
                index +
                  marker.length
              )
            );

          if (
            oldPath &&
            oldPath !== filePath
          ) {
            await supabase.storage
              .from("avatars")
              .remove([
                oldPath,
              ]);
          }
        }
      }

      closeAvatarCrop();

      alert(
        "Profil fotoğrafın başarıyla güncellendi."
      );
    } catch (error) {
      console.error(
        "SAVE AVATAR ERROR:",
        getSupabaseErrorDetails(
          error
        )
      );

      alert(
        "Profil fotoğrafı kaydedilirken bir hata oluştu."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * PORTFOLYO GÖRSELİ
   */

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(
        "Lütfen bir görsel dosyası seçin."
      );
      event.target.value = "";
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      alert(
        "Görsel boyutu en fazla 5 MB olabilir."
      );
      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview
      );
    }

    setSelectedImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);

    event.target.value = "";
  };

  /*
   * PROFİL
   */

  const openProfileForm = () => {
    if (!profile) return;

    setProfileForm({
      first_name:
        profile.first_name || "",
      last_name:
        profile.last_name || "",
      title:
        profile.title || "",
      bio:
        profile.bio || "",
      city:
        profile.city || "",
      phone:
        profile.phone || "",
      hourly_rate:
        profile.hourly_rate !==
          null &&
        profile.hourly_rate !==
          undefined
          ? String(
              profile.hourly_rate
            )
          : "",
      availability:
        profile.availability ||
        "",
      experience:
        profile.experience ||
        "",
      skills:
        profile.skills || [],
      expertise:
        profile.expertise || [],
      work_types:
        profile.work_types || [],
      languages:
        profile.languages || [],
    });

    setProfileSkillSearch("");
    setShowProfileSkillSuggestions(
      false
    );

    setExpertiseSearch("");
    setShowExpertiseSuggestions(
      false
    );

    setShowProfileForm(true);
  };

  const saveProfile = async () => {
    if (!profile) return;

    if (
      !profileForm.first_name.trim()
    ) {
      alert(
        "Ad alanı zorunludur."
      );
      return;
    }

    if (
      !profileForm.title.trim()
    ) {
      alert(
        "Ünvan alanı zorunludur."
      );
      return;
    }

    setSaving(true);

    try {
      const hourlyRate =
        profileForm.hourly_rate.trim()
          ? Number(
              profileForm.hourly_rate
            )
          : null;

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .update({
          first_name:
            profileForm.first_name.trim(),
          last_name:
            profileForm.last_name.trim() ||
            null,
          title:
            profileForm.title.trim(),
          bio:
            profileForm.bio.trim() ||
            null,
          city:
            profileForm.city.trim() ||
            null,
          phone:
            profileForm.phone.trim() ||
            null,
          hourly_rate:
            hourlyRate !== null &&
            !Number.isNaN(
              hourlyRate
            )
              ? hourlyRate
              : null,
          availability:
            profileForm.availability ||
            null,
          experience:
            profileForm.experience ||
            null,
          skills:
            profileForm.skills,
          expertise:
            profileForm.expertise,
          work_types:
            profileForm.work_types,
          languages:
            profileForm.languages,
        })
        .eq(
          "id",
          profile.id
        )
        .select(
          "id, first_name, last_name, avatar_url, title, bio, skills, city, hourly_rate, availability, experience, expertise, work_types, languages, phone"
        )
        .single();

      if (error) {
        console.error(
          "PROFILE UPDATE ERROR:",
          getSupabaseErrorDetails(
            error
          )
        );

        alert(
          "Profil kaydedilemedi."
        );

        return;
      }

      setProfile(
        data as Profile
      );

      setShowProfileForm(false);

      alert(
        "Profil bilgilerin başarıyla güncellendi."
      );
    } catch (error) {
      console.error(
        "SAVE PROFILE ERROR:",
        getSupabaseErrorDetails(
          error
        )
      );

      alert(
        "Profil kaydedilirken bir hata oluştu."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleProfileArrayValue = (
    field:
      | "skills"
      | "expertise"
      | "work_types"
      | "languages",
    value: string
  ) => {
    setProfileForm(
      (current) => {
        const values =
          current[field];

        return {
          ...current,
          [field]: values.includes(
            value
          )
            ? values.filter(
                (item) =>
                  item !== value
              )
            : [
                ...values,
                value,
              ],
        };
      }
    );
  };

  const filteredProfileSkills =
    useMemo(() => {
      return SKILL_OPTIONS.filter(
        (skill) =>
          skill
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(
              profileSkillSearch.toLocaleLowerCase(
                "tr-TR"
              )
            ) &&
          !profileForm.skills.includes(
            skill
          )
      ).slice(0, 12);
    }, [
      profileSkillSearch,
      profileForm.skills,
    ]);

  const filteredExpertiseOptions =
    useMemo(() => {
      const search =
        expertiseSearch
          .toLocaleLowerCase(
            "tr-TR"
          )
          .trim();

      return EXPERTISE_OPTIONS.filter(
        (option) =>
          !profileForm.expertise.includes(
            option
          ) &&
          option
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(search)
      );
    }, [
      expertiseSearch,
      profileForm.expertise,
    ]);

  const addProfileSkill = (
    skill: string
  ) => {
    if (
      profileForm.skills.includes(
        skill
      )
    ) {
      return;
    }

    setProfileForm(
      (current) => ({
        ...current,
        skills: [
          ...current.skills,
          skill,
        ],
      })
    );

    setProfileSkillSearch("");
    setShowProfileSkillSuggestions(
      true
    );
  };

  const removeProfileSkill = (
    skill: string
  ) => {
    setProfileForm(
      (current) => ({
        ...current,
        skills:
          current.skills.filter(
            (item) =>
              item !== skill
          ),
      })
    );
  };

  const addExpertise = (
    expertise: string
  ) => {
    if (
      profileForm.expertise.includes(
        expertise
      )
    ) {
      return;
    }

    setProfileForm(
      (current) => ({
        ...current,
        expertise: [
          ...current.expertise,
          expertise,
        ],
      })
    );

    setExpertiseSearch("");
    setShowExpertiseSuggestions(
      true
    );
  };

  const removeExpertise = (
    expertise: string
  ) => {
    setProfileForm(
      (current) => ({
        ...current,
        expertise:
          current.expertise.filter(
            (item) =>
              item !== expertise
          ),
      })
    );
  };

  /*
   * PORTFOLYO
   */

  const resetPortfolioForm =
    () => {
      if (imagePreview) {
        URL.revokeObjectURL(
          imagePreview
        );
      }

      setPortfolioForm({
        title: "",
        category: "",
        description: "",
        skills: [],
      });

      setSkillSearch("");
      setShowSkillSuggestions(
        false
      );

      setSelectedImage(null);
      setImagePreview(null);
    };

  const closePortfolioForm =
    () => {
      setShowPortfolioForm(
        false
      );

      resetPortfolioForm();
    };

  const addSkill = (
    skill: string
  ) => {
    if (
      portfolioForm.skills.includes(
        skill
      )
    ) {
      return;
    }

    setPortfolioForm(
      (current) => ({
        ...current,
        skills: [
          ...current.skills,
          skill,
        ],
      })
    );

    setSkillSearch("");
    setShowSkillSuggestions(
      true
    );
  };

  const removeSkill = (
    skill: string
  ) => {
    setPortfolioForm(
      (current) => ({
        ...current,
        skills:
          current.skills.filter(
            (item) =>
              item !== skill
          ),
      })
    );
  };

  const filteredSkills =
    SKILL_OPTIONS.filter(
      (skill) =>
        skill
          .toLocaleLowerCase(
            "tr-TR"
          )
          .includes(
            skillSearch.toLocaleLowerCase(
              "tr-TR"
            )
          ) &&
        !portfolioForm.skills.includes(
          skill
        )
    ).slice(0, 12);

  const addPortfolio =
    async () => {
      if (!profile) return;

      if (
        !portfolioForm.title.trim()
      ) {
        alert(
          "Proje adı zorunludur."
        );
        return;
      }

      if (
        !portfolioForm.category
      ) {
        alert(
          "Kategori seçmelisiniz."
        );
        return;
      }

      if (!selectedImage) {
        alert(
          "Proje görseli eklemelisiniz."
        );
        return;
      }

      setSaving(true);

      try {
        const fileExtension =
          selectedImage.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const fileName = `${profile.id}/${crypto.randomUUID()}.${fileExtension}`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from(
            "portfolio-images"
          )
          .upload(
            fileName,
            selectedImage,
            {
              cacheControl:
                "3600",
              upsert: false,
            }
          );

        if (uploadError) {
          console.error(
            "PORTFOLIO IMAGE UPLOAD ERROR:",
            getSupabaseErrorDetails(
              uploadError
            )
          );

          alert(
            "Görsel yüklenirken bir hata oluştu."
          );

          return;
        }

        const {
          data: {
            publicUrl,
          },
        } = supabase.storage
          .from(
            "portfolio-images"
          )
          .getPublicUrl(
            fileName
          );

        const {
          data,
          error,
        } = await supabase
          .from(
            "portfolio_items"
          )
          .insert({
            freelancer_id:
              profile.id,
            title:
              portfolioForm.title.trim(),
            category:
              portfolioForm.category,
            description:
              portfolioForm.description.trim() ||
              null,
            image_url:
              publicUrl,
            skills:
              portfolioForm.skills,
          })
          .select()
          .single();

        if (error) {
          console.error(
            "PORTFOLIO INSERT ERROR:",
            getSupabaseErrorDetails(
              error
            )
          );

          await supabase.storage
            .from(
              "portfolio-images"
            )
            .remove([
              fileName,
            ]);

          alert(
            "Portfolyo projesi kaydedilemedi."
          );

          return;
        }

        setPortfolio(
          (current) => [
            data as PortfolioItem,
            ...current,
          ]
        );

        closePortfolioForm();
      } catch (error) {
        console.error(
          "ADD PORTFOLIO ERROR:",
          getSupabaseErrorDetails(
            error
          )
        );

        alert(
          "Portfolyo projesi eklenirken bir hata oluştu."
        );
      } finally {
        setSaving(false);
      }
    };

  const deletePortfolio =
    async (
      item: PortfolioItem
    ) => {
      const confirmed =
        window.confirm(
          `"${item.title}" portfolyo projesini silmek istediğinize emin misiniz?`
        );

      if (!confirmed) return;

      const {
        error,
      } = await supabase
        .from(
          "portfolio_items"
        )
        .delete()
        .eq(
          "id",
          item.id
        );

      if (error) {
        console.error(
          "PORTFOLIO DELETE ERROR:",
          getSupabaseErrorDetails(
            error
          )
        );

        alert(
          "Portfolyo projesi silinemedi."
        );

        return;
      }

      if (item.image_url) {
        const marker =
          "/storage/v1/object/public/portfolio-images/";

        const index =
          item.image_url.indexOf(
            marker
          );

        if (index !== -1) {
          const filePath =
            decodeURIComponent(
              item.image_url.substring(
                index +
                  marker.length
              )
            );

          await supabase.storage
            .from(
              "portfolio-images"
            )
            .remove([
              filePath,
            ]);
        }
      }

      setPortfolio(
        (current) =>
          current.filter(
            (project) =>
              project.id !==
              item.id
          )
      );
    };

  /*
   * DENEYİMLER
   */

  const addExperience =
    async () => {
      if (!profile) return;

      if (
        !experienceForm.company_name.trim() ||
        !experienceForm.position.trim()
      ) {
        alert(
          "Şirket ve pozisyon alanları zorunludur."
        );

        return;
      }

      setSaving(true);

      try {
        const {
          data,
          error,
        } = await supabase
          .from("experiences")
          .insert({
            freelancer_id:
              profile.id,
            company_name:
              experienceForm.company_name.trim(),
            position:
              experienceForm.position.trim(),
            start_date:
              experienceForm.start_date ||
              null,
            end_date:
              experienceForm.end_date ||
              null,
            description:
              experienceForm.description.trim() ||
              null,
          })
          .select()
          .single();

        if (error) {
          console.error(
            "EXPERIENCE INSERT ERROR:",
            getSupabaseErrorDetails(
              error
            )
          );

          alert(
            "Deneyim kaydedilemedi."
          );

          return;
        }

        setExperiences(
          (current) => [
            data as Experience,
            ...current,
          ]
        );

        setExperienceForm({
          company_name: "",
          position: "",
          start_date: "",
          end_date: "",
          description: "",
        });

        setShowExperienceForm(
          false
        );
      } catch (error) {
        console.error(
          "ADD EXPERIENCE ERROR:",
          getSupabaseErrorDetails(
            error
          )
        );

        alert(
          "Deneyim eklenirken bir hata oluştu."
        );
      } finally {
        setSaving(false);
      }
    };

  const deleteExperience =
    async (
      id: string
    ) => {
      const confirmed =
        window.confirm(
          "Bu deneyimi silmek istediğinize emin misiniz?"
        );

      if (!confirmed) return;

      const {
        error,
      } = await supabase
        .from("experiences")
        .delete()
        .eq(
          "id",
          id
        );

      if (error) {
        console.error(
          "EXPERIENCE DELETE ERROR:",
          getSupabaseErrorDetails(
            error
          )
        );

        alert(
          "Deneyim silinemedi."
        );

        return;
      }

      setExperiences(
        (current) =>
          current.filter(
            (experience) =>
              experience.id !==
              id
          )
      );
    };

  /*
   * LOADING
   */

  if (loading) {
    return (
      <main className="w-full p-8">
        <p className="text-sm text-gray-500">
          Profil yükleniyor...
        </p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="w-full p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <p className="text-sm text-gray-500">
            Profil bilgileri bulunamadı.
          </p>
        </div>
      </main>
    );
  }

  const fullName =
    `${profile.first_name || ""} ${
      profile.last_name || ""
    }`.trim() ||
    "Freelancer";

  const skills =
    profile.skills || [];

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (name) => name[0]
      )
      .join("")
      .toLocaleUpperCase(
        "tr-TR"
      );

  return (
    <main className="w-full p-8">
      {/* PROFİL HEADER */}

      <section className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-8">
        <div className="flex items-center gap-5">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={
                  profile.avatar_url
                }
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-2xl font-semibold text-white">
                {initials}
              </div>
            )}

            <button
              type="button"
              onClick={
                openAvatarPicker
              }
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow-md transition hover:bg-gray-800"
              title="Profil fotoğrafını değiştir"
            >
              <Camera size={16} />
            </button>

            <input
              ref={
                avatarInputRef
              }
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={
                handleAvatarChange
              }
              className="hidden"
            />
          </div>

          <div>
            <h1 className="text-2xl font-semibold">
              {fullName}
            </h1>

            <p className="mt-1 text-gray-500">
              {profile.title ||
                "Ünvan belirtilmedi"}
            </p>

            {profile.city && (
              <p className="mt-3 text-sm text-gray-500">
                {profile.city}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={
            openProfileForm
          }
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black"
        >
          <Pencil size={16} />
          Profili Düzenle
        </button>
      </section>

      {/* HAKKIMDA */}

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">
          Hakkımda
        </h2>

        <p className="text-sm leading-6 text-gray-600">
          {profile.bio ||
            "Henüz açıklama eklenmedi."}
        </p>
      </section>

      {/* UZMANLIKLAR */}

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">
          Uzmanlıklar
        </h2>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {skills.map(
              (skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-gray-100 px-4 py-2 text-sm"
                >
                  {skill}
                </span>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Henüz uzmanlık
            eklenmedi.
          </p>
        )}
      </section>

      {/* PORTFOLYO */}

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              Portfolyo
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Çalışmalarınızı
              sergileyin.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowPortfolioForm(
                true
              )
            }
            className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm text-white transition hover:bg-gray-800"
          >
            <Plus size={16} />
            Proje Ekle
          </button>
        </div>

        {portfolio.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <ImageIcon
              size={28}
              className="mx-auto mb-3 text-gray-300"
            />

            <p className="text-sm text-gray-500">
              Henüz portfolyo
              projesi
              eklenmedi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {portfolio.map(
              (project) => (
                <div
                  key={
                    project.id
                  }
                  className="overflow-hidden rounded-xl border border-gray-200"
                >
                  {project.image_url ? (
                    <img
                      src={
                        project.image_url
                      }
                      alt={
                        project.title
                      }
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-gray-100 text-sm text-gray-400">
                      Görsel yok
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">
                          {
                            project.title
                          }
                        </h3>

                        {project.category && (
                          <p className="mt-1 text-sm text-gray-500">
                            {
                              project.category
                            }
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deletePortfolio(
                            project
                          )
                        }
                        className="text-gray-400 transition hover:text-red-500"
                        title="Projeyi sil"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>

                    {project.description && (
                      <p className="mt-3 text-sm leading-5 text-gray-600">
                        {
                          project.description
                        }
                      </p>
                    )}

                    {project.skills &&
                      project.skills
                        .length >
                        0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {project.skills.map(
                            (
                              skill
                            ) => (
                              <span
                                key={
                                  skill
                                }
                                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs"
                              >
                                {
                                  skill
                                }
                              </span>
                            )
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* DENEYİMLER */}

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              Geçmiş Deneyimler
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              İsteğe bağlı olarak
              deneyimlerinizi
              ekleyebilirsiniz.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowExperienceForm(
                true
              )
            }
            className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm text-white transition hover:bg-gray-800"
          >
            <Plus size={16} />
            Deneyim Ekle
          </button>
        </div>

        {experiences.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">
              Henüz deneyim
              eklenmedi.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {experiences.map(
              (experience) => (
                <div
                  key={
                    experience.id
                  }
                  className="flex justify-between gap-5 border-b border-gray-100 pb-5 last:border-0 last:pb-0"
                >
                  <div>
                    <h3 className="font-medium">
                      {
                        experience.position
                      }
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {
                        experience.company_name
                      }
                    </p>

                    {(experience.start_date ||
                      experience.end_date) && (
                      <p className="mt-2 text-xs text-gray-400">
                        {experience.start_date ||
                          "Başlangıç"}
                        {" - "}
                        {experience.end_date ||
                          "Devam ediyor"}
                      </p>
                    )}

                    {experience.description && (
                      <p className="mt-3 text-sm leading-5 text-gray-600">
                        {
                          experience.description
                        }
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      deleteExperience(
                        experience.id
                      )
                    }
                    className="text-gray-400 transition hover:text-red-500"
                    title="Deneyimi sil"
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* PROFİL DÜZENLE */}

      {showProfileForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">

            {/* MODAL HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-7 py-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Profili Düzenle
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Profil bilgilerini
                  güncelle.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowProfileForm(
                    false
                  )
                }
                className="text-gray-400 transition hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            {/* FOTOĞRAF */}

            <div className="mx-7 mt-5 flex shrink-0 items-center gap-5 rounded-xl border border-gray-200 p-4">
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={
                      profile.avatar_url
                    }
                    alt={fullName}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-xl font-semibold text-white">
                    {initials}
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    openAvatarPicker
                  }
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-black text-white shadow"
                  title="Fotoğrafı değiştir"
                >
                  <Camera size={14} />
                </button>
              </div>

              <div>
                <p className="text-sm font-medium">
                  Profil fotoğrafı
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Kare olarak
                  kırpılır.
                  Yüzünüzün net
                  göründüğü bir
                  fotoğraf tercih
                  edin.
                </p>

                <button
                  type="button"
                  onClick={
                    openAvatarPicker
                  }
                  className="mt-2 text-sm font-medium text-black underline underline-offset-4"
                >
                  Fotoğrafı
                  değiştir
                </button>
              </div>
            </div>

            {/* FORM CONTENT */}

            <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">

                {/* AD */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Ad
                  </label>

                  <input
                    value={
                      profileForm.first_name
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        first_name:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Adınız"
                  />
                </div>

                {/* SOYAD */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Soyad
                  </label>

                  <input
                    value={
                      profileForm.last_name
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        last_name:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Soyadınız"
                  />
                </div>

                {/* ÜNVAN */}

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Ünvan
                  </label>

                  <input
                    value={
                      profileForm.title
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        title:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Örn. UI/UX Designer"
                  />
                </div>

                {/* ŞEHİR */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Şehir
                  </label>

                  <input
                    value={
                      profileForm.city
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        city:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="İstanbul"
                  />
                </div>

                {/* TELEFON */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Telefon
                  </label>

                  <input
                    value={
                      profileForm.phone
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        phone:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Telefon numarası"
                  />
                </div>

                {/* ÜCRET */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Saatlik ücret
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={
                        profileForm.hourly_rate
                      }
                      onChange={(
                        event
                      ) =>
                        setProfileForm({
                          ...profileForm,
                          hourly_rate:
                            event.target
                              .value,
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-sm outline-none focus:border-black"
                      placeholder="1500"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      TL
                    </span>
                  </div>
                </div>

                {/* DENEYİM */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Deneyim
                  </label>

                  <select
                    value={
                      profileForm.experience
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        experience:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Deneyim seçin
                    </option>

                    {EXPERIENCE_OPTIONS.map(
                      (option) => (
                        <option
                          key={option}
                          value={
                            option
                          }
                        >
                          {option}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* MÜSAİTLİK */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Müsaitlik
                  </label>

                  <select
                    value={
                      profileForm.availability
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        availability:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                  >
                    <option value="">
                      Müsaitlik seçin
                    </option>

                    {AVAILABILITY_OPTIONS.map(
                      (option) => (
                        <option
                          key={option}
                          value={
                            option
                          }
                        >
                          {option}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* HAKKIMDA */}

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Hakkımda
                  </label>

                  <textarea
                    value={
                      profileForm.bio
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileForm({
                        ...profileForm,
                        bio: event.target
                          .value,
                      })
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none focus:border-black"
                    placeholder="Kendinizden ve yaptığınız işlerden bahsedin."
                  />
                </div>

                {/* YETENEKLER */}

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Yetenekler
                  </label>

                  <div className="relative">
                    <div className="min-h-[52px] rounded-xl border border-gray-200 px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {profileForm.skills.map(
                          (skill) => (
                            <span
                              key={
                                skill
                              }
                              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs"
                            >
                              {skill}

                              <button
                                type="button"
                                onClick={() =>
                                  removeProfileSkill(
                                    skill
                                  )
                                }
                                className="text-gray-400 transition hover:text-black"
                                title="Yeteneği kaldır"
                              >
                                <X
                                  size={
                                    13
                                  }
                                />
                              </button>
                            </span>
                          )
                        )}

                        <input
                          value={
                            profileSkillSearch
                          }
                          onChange={(
                            event
                          ) => {
                            setProfileSkillSearch(
                              event.target
                                .value
                            );

                            setShowProfileSkillSuggestions(
                              true
                            );
                          }}
                          onFocus={() =>
                            setShowProfileSkillSuggestions(
                              true
                            )
                          }
                          onBlur={() => {
                            setTimeout(
                              () => {
                                setShowProfileSkillSuggestions(
                                  false
                                );
                              },
                              150
                            );
                          }}
                          placeholder={
                            profileForm
                              .skills
                              .length ===
                            0
                              ? "Yetenek ara..."
                              : "Başka yetenek ekle..."
                          }
                          className="min-w-[150px] flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none"
                        />
                      </div>
                    </div>

                    {showProfileSkillSuggestions &&
                      filteredProfileSkills.length >
                        0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                          {filteredProfileSkills.map(
                            (
                              skill
                            ) => (
                              <button
                                key={
                                  skill
                                }
                                type="button"
                                onMouseDown={(
                                  event
                                ) =>
                                  event.preventDefault()
                                }
                                onClick={() =>
                                  addProfileSkill(
                                    skill
                                  )
                                }
                                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-gray-100"
                              >
                                {
                                  skill
                                }
                              </button>
                            )
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* UZMANLIK ALANLARI */}

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-medium">
                    Uzmanlık alanları
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowExpertiseSuggestions(
                          (current) =>
                            !current
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm outline-none transition hover:border-gray-400 focus:border-black"
                    >
                      <span
                        className={
                          profileForm
                            .expertise
                            .length >
                          0
                            ? "text-gray-900"
                            : "text-gray-400"
                        }
                      >
                        {profileForm
                          .expertise
                          .length >
                        0
                          ? `${profileForm.expertise.length} uzmanlık alanı seçildi`
                          : "Uzmanlık alanı seçin"}
                      </span>

                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${
                          showExpertiseSuggestions
                            ? "rotate-180"
                            : ""
                        }`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    {showExpertiseSuggestions && (
                      <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                        <div className="border-b border-gray-100 p-3">
                          <input
                            value={
                              expertiseSearch
                            }
                            onChange={(
                              event
                            ) =>
                              setExpertiseSearch(
                                event.target
                                  .value
                              )
                            }
                            autoFocus
                            placeholder="Uzmanlık alanı ara..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-black"
                          />
                        </div>

                        <div className="max-h-52 overflow-y-auto p-2">
                          {filteredExpertiseOptions.length >
                          0 ? (
                            filteredExpertiseOptions.map(
                              (
                                option
                              ) => (
                                <button
                                  key={
                                    option
                                  }
                                  type="button"
                                  onMouseDown={(
                                    event
                                  ) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    addExpertise(
                                      option
                                    )
                                  }
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-gray-100"
                                >
                                  <span>
                                    {
                                      option
                                    }
                                  </span>

                                  <Plus
                                    size={
                                      15
                                    }
                                    className="text-gray-400"
                                  />
                                </button>
                              )
                            )
                          ) : (
                            <p className="px-3 py-4 text-center text-sm text-gray-400">
                              {profileForm
                                .expertise
                                .length ===
                              EXPERTISE_OPTIONS.length
                                ? "Tüm uzmanlık alanları seçildi."
                                : "Uzmanlık alanı bulunamadı."}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {profileForm
                    .expertise
                    .length >
                    0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profileForm.expertise.map(
                        (
                          expertise
                        ) => (
                          <span
                            key={
                              expertise
                            }
                            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-800"
                          >
                            {
                              expertise
                            }

                            <button
                              type="button"
                              onClick={() =>
                                removeExpertise(
                                  expertise
                                )
                              }
                              className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition hover:bg-black hover:text-white"
                              title="Uzmanlığı kaldır"
                            >
                              <X
                                size={
                                  12
                                }
                              />
                            </button>
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* ÇALIŞMA TÜRÜ */}

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    Çalışma türü
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {WORK_TYPE_OPTIONS.map(
                      (option) => {
                        const selected =
                          profileForm.work_types.includes(
                            option
                          );

                        return (
                          <button
                            key={
                              option
                            }
                            type="button"
                            onClick={() =>
                              toggleProfileArrayValue(
                                "work_types",
                                option
                              )
                            }
                            className={`rounded-full border px-4 py-2 text-sm transition ${
                              selected
                                ? "border-black bg-black text-white"
                                : "border-gray-200 text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            {
                              option
                            }
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* DİLLER */}

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    Diller
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map(
                      (option) => {
                        const selected =
                          profileForm.languages.includes(
                            option
                          );

                        return (
                          <button
                            key={
                              option
                            }
                            type="button"
                            onClick={() =>
                              toggleProfileArrayValue(
                                "languages",
                                option
                              )
                            }
                            className={`rounded-full border px-4 py-2 text-sm transition ${
                              selected
                                ? "border-black bg-black text-white"
                                : "border-gray-200 text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            {
                              option
                            }
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-100 px-7 py-4">
              <button
                type="button"
                onClick={() =>
                  setShowProfileForm(
                    false
                  )
                }
                className="rounded-xl px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-100"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  saveProfile
                }
                className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save size={16} />

                {saving
                  ? "Kaydediliyor..."
                  : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AVATAR CROP */}

      {showAvatarCrop &&
        avatarPreview && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Profil fotoğrafını
                    düzenle
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Fotoğrafı
                    sürükleyerek
                    konumlandır.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeAvatarCrop
                  }
                  className="text-gray-400 hover:text-black"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex justify-center">
                <div
                  className="relative h-[320px] w-[320px] cursor-grab select-none overflow-hidden rounded-full bg-gray-100 active:cursor-grabbing"
                  onMouseDown={
                    handleCropMouseDown
                  }
                  onMouseMove={
                    handleCropMouseMove
                  }
                  onMouseUp={
                    handleCropMouseUp
                  }
                  onMouseLeave={
                    handleCropMouseUp
                  }
                >
                  <img
                    ref={
                      cropImageRef
                    }
                    src={
                      avatarPreview
                    }
                    alt="Profil fotoğrafı kırpma"
                    draggable={
                      false
                    }
                    className="pointer-events-none absolute max-w-none select-none"
                    style={{
                      width: `${
                        cropImageSize.width *
                        cropScale
                      }px`,
                      height: `${
                        cropImageSize.height *
                        cropScale
                      }px`,
                      left: `${cropOffset.x}px`,
                      top: `${cropOffset.y}px`,
                    }}
                  />

                  <div className="pointer-events-none absolute inset-0 rounded-full ring-[999px] ring-black/45" />

                  <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90" />
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center gap-3">
                  <ZoomOut
                    size={17}
                    className="text-gray-500"
                  />

                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={
                      cropScale
                    }
                    onChange={(
                      event
                    ) =>
                      handleCropZoom(
                        Number(
                          event.target
                            .value
                        )
                      )
                    }
                    className="w-full"
                  />

                  <ZoomIn
                    size={17}
                    className="text-gray-500"
                  />
                </div>

                <p className="text-center text-xs text-gray-400">
                  Fotoğrafı
                  sürükleyebilir ve
                  yakınlaştırabilirsin.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={
                    closeAvatarCrop
                  }
                  className="rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    saveAvatar
                  }
                  className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save size={16} />

                  {saving
                    ? "Kaydediliyor..."
                    : "Fotoğrafı Kaydet"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* PORTFOLYO FORM */}

      {showPortfolioForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Portfolyo Projesi
                  Ekle
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Çalışmanızı
                  profilinizde
                  sergileyin.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closePortfolioForm
                }
                className="text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Proje Görseli
                </label>

                <label className="block cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-500">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={
                          imagePreview
                        }
                        alt="Proje önizleme"
                        className="h-56 w-full object-cover"
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition hover:opacity-100">
                        <span className="rounded-lg bg-white px-4 py-2 text-sm">
                          Görseli
                          değiştir
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center">
                      <Upload
                        size={28}
                        className="mb-3 text-gray-400"
                      />

                      <p className="text-sm font-medium">
                        Görsel seçin
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        PNG, JPG veya
                        WEBP • Maks.
                        5 MB
                      </p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={
                      handleImageChange
                    }
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Proje Adı
                </label>

                <input
                  value={
                    portfolioForm.title
                  }
                  onChange={(
                    event
                  ) =>
                    setPortfolioForm({
                      ...portfolioForm,
                      title:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Örn. Mobil Bankacılık Uygulaması"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Kategori
                </label>

                <select
                  value={
                    portfolioForm.category
                  }
                  onChange={(
                    event
                  ) =>
                    setPortfolioForm({
                      ...portfolioForm,
                      category:
                        event.target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="">
                    Kategori seçin
                  </option>

                  {PORTFOLIO_CATEGORIES.map(
                    (
                      category
                    ) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {
                          category
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Proje Açıklaması
                </label>

                <textarea
                  value={
                    portfolioForm.description
                  }
                  onChange={(
                    event
                  ) =>
                    setPortfolioForm({
                      ...portfolioForm,
                      description:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Projeyi ve yaptığınız çalışmayı kısaca anlatın."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Kullanılan
                  Yetenekler
                </label>

                <div className="relative">
                  <div className="min-h-[52px] rounded-xl border border-gray-200 px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {portfolioForm.skills.map(
                        (skill) => (
                          <span
                            key={
                              skill
                            }
                            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs"
                          >
                            {
                              skill
                            }

                            <button
                              type="button"
                              onClick={() =>
                                removeSkill(
                                  skill
                                )
                              }
                              className="text-gray-400 hover:text-black"
                            >
                              <X
                                size={
                                  13
                                }
                              />
                            </button>
                          </span>
                        )
                      )}

                      <input
                        value={
                          skillSearch
                        }
                        onChange={(
                          event
                        ) => {
                          setSkillSearch(
                            event.target
                              .value
                          );

                          setShowSkillSuggestions(
                            true
                          );
                        }}
                        onFocus={() =>
                          setShowSkillSuggestions(
                            true
                          )
                        }
                        onBlur={() => {
                          setTimeout(
                            () => {
                              setShowSkillSuggestions(
                                false
                              );
                            },
                            150
                          );
                        }}
                        placeholder={
                          portfolioForm
                            .skills
                            .length ===
                          0
                            ? "Yetenek ara..."
                            : "Başka yetenek ekle..."
                        }
                        className="min-w-[150px] flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
                  </div>

                  {showSkillSuggestions &&
                    filteredSkills.length >
                      0 && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                        {filteredSkills.map(
                          (
                            skill
                          ) => (
                            <button
                              key={
                                skill
                              }
                              type="button"
                              onMouseDown={(
                                event
                              ) =>
                                event.preventDefault()
                              }
                              onClick={() =>
                                addSkill(
                                  skill
                                )
                              }
                              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-100"
                            >
                              {
                                skill
                              }
                            </button>
                          )
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={
                  closePortfolioForm
                }
                className="rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  !portfolioForm.title.trim() ||
                  !portfolioForm.category ||
                  !selectedImage
                }
                onClick={
                  addPortfolio
                }
                className="rounded-xl bg-black px-5 py-2.5 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Kaydediliyor..."
                  : "Projeyi Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPERIENCE FORM */}

      {showExperienceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Deneyim Ekle
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Geçmiş iş
                  deneyimlerinizi
                  ekleyebilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowExperienceForm(
                    false
                  )
                }
                className="text-gray-400 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={
                  experienceForm.company_name
                }
                onChange={(
                  event
                ) =>
                  setExperienceForm({
                    ...experienceForm,
                    company_name:
                      event.target
                        .value,
                  })
                }
                placeholder="Şirket / müşteri adı"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
              />

              <input
                value={
                  experienceForm.position
                }
                onChange={(
                  event
                ) =>
                  setExperienceForm({
                    ...experienceForm,
                    position:
                      event.target
                        .value,
                  })
                }
                placeholder="Pozisyon"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs text-gray-500">
                    Başlangıç
                  </label>

                  <input
                    type="date"
                    value={
                      experienceForm.start_date
                    }
                    onChange={(
                      event
                    ) =>
                      setExperienceForm({
                        ...experienceForm,
                        start_date:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs text-gray-500">
                    Bitiş
                  </label>

                  <input
                    type="date"
                    value={
                      experienceForm.end_date
                    }
                    onChange={(
                      event
                    ) =>
                      setExperienceForm({
                        ...experienceForm,
                        end_date:
                          event.target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>

              <textarea
                value={
                  experienceForm.description
                }
                onChange={(
                  event
                ) =>
                  setExperienceForm({
                    ...experienceForm,
                    description:
                      event.target
                        .value,
                  })
                }
                placeholder="Deneyiminizi kısaca anlatın."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowExperienceForm(
                    false
                  )
                }
                className="rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  !experienceForm.company_name.trim() ||
                  !experienceForm.position.trim()
                }
                onClick={
                  addExperience
                }
                className="rounded-xl bg-black px-5 py-2.5 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Kaydediliyor..."
                  : "Deneyimi Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}