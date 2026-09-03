"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import {
  Briefcase,
  Clock,
  DollarSign,
  Users,
  MessageSquare,
  Eye,
  CalendarDays,
  TrendingUp,
  CheckCircle2,
  Send,
  UserCheck,
} from "lucide-react";

type Profile = {
  id: string;
  expertise?: string | null;
  skills?: string[] | null;
  avatar_url?: string | null;
  profile_completion?: number | null;
  about?: string | null;
  experience?: string | null;
};

export default function FreelancerDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userName, setUserName] = useState("Freelancer");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          setLoading(false);
          return;
        }

        // Kullanıcının kayıt sırasında Auth'a kaydedilen ismini al
        const name =
          user.user_metadata?.first_name ||
          user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          "Freelancer";

        setUserName(name);

        const { data, error } = await supabase
          .from("profiles")
          .select(
          "id, expertise, skills, avatar_url, profile_completion"
          )
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("PROFILE FETCH ERROR:", error);
          return;
        }

        setProfile(data);

        // Supabase'den gelen gerçek avatar URL'sini kullan
        if (data?.avatar_url) {
          setAvatar(data.avatar_url);
        }
      } catch (error) {
        console.error("DASHBOARD ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, []);

  const expertise =
    profile?.expertise || "Henüz uzmanlık alanı eklenmemiş";

  const skills = profile?.skills || [];

  const profileCompletion =
    profile?.profile_completion ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">
          Profil yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">

          {avatar ? (
            <img
              src={avatar}
              alt={userName}
              className="w-16 h-16 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Hoş geldin, {userName} 👋
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              Freelancer hesabının performansını ve projelerini buradan yönetebilirsin.
            </p>
          </div>
        </div>

        <button
          className="
            bg-black
            text-white
            px-5
            py-2.5
            rounded-xl
            text-sm
            hover:opacity-90
            transition
          "
        >
          + Yeni Teklif
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <KpiCard
          title="Aktif Projeler"
          value="6"
          change="+2 bu ay"
          icon={<Briefcase />}
        />

        <KpiCard
          title="Bekleyen Teklif"
          value="12"
          change="4 yeni"
          icon={<Clock />}
        />

        <KpiCard
          title="Toplam Kazanç"
          value="₺48.500"
          change="+18%"
          icon={<DollarSign />}
        />

        <KpiCard
          title="Profil Ziyareti"
          value="324"
          change="+42%"
          icon={<Users />}
        />
      </div>

      {/* Main */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Projects */}
        <div
          className="
            lg:col-span-2
            bg-white
            rounded-2xl
            p-6
            shadow-sm
            hover:shadow-md
            transition
          "
        >
          <div className="flex justify-between mb-6">
            <h2 className="font-semibold">
              Aktif Projeler
            </h2>

            <button className="text-sm text-blue-600">
              Tümünü Gör
            </button>
          </div>

          <Project
            title="Fintech Dashboard UI Design"
            company="Albaraka"
            progress="70%"
            status="Devam Ediyor"
          />

          <Project
            title="Mobil Uygulama Tasarımı"
            company="Startup"
            progress="45%"
            status="Revize Bekliyor"
          />

          <Project
            title="Landing Page"
            company="SaaS Company"
            progress="100%"
            status="Tamamlandı"
          />
        </div>

        {/* Live Panel */}
        <div
          className="
            bg-white
            rounded-2xl
            p-6
            shadow-sm
            hover:shadow-md
            transition
          "
        >
          <h2 className="font-semibold mb-6">
            Canlı Durum
          </h2>

          <LiveItem
            icon={<MessageSquare />}
            title="Mesajlar"
            value="4 yeni mesaj"
          />

          <LiveItem
            icon={<Eye />}
            title="Profil"
            value="+24 ziyaret"
          />

          <LiveItem
            icon={<CalendarDays />}
            title="Teslim"
            value="2 yaklaşan görev"
          />
        </div>
      </div>

 {/* Profile Summary */}
<div className="bg-white rounded-2xl p-6 shadow-sm">
  <div className="flex items-center justify-between mb-5">
    <h2 className="font-semibold">
      Profil Özeti
    </h2>

    <button
      className="text-sm text-blue-600 hover:text-blue-700 transition"
    >
      Profili Düzenle
    </button>
  </div>

  <div className="flex items-center gap-4">
    {avatar ? (
      <img
        src={avatar}
        alt={userName}
        className="w-14 h-14 rounded-full object-cover border border-gray-200"
      />
    ) : (
      <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-lg font-semibold text-gray-600">
        {userName.charAt(0).toUpperCase()}
      </div>
    )}

    <div className="min-w-0">
      <h3 className="font-semibold text-gray-900">
        {userName}
      </h3>

      <p className="text-sm text-gray-500 mt-1">
        {expertise}
      </p>
      {profile?.about && (
  <p className="text-sm text-gray-600 mt-3">
    {profile.about}
  </p>
)}

{profile?.experience && (
  <p className="text-sm text-gray-500 mt-2">
    {profile.experience}
  </p>
)}
    </div>
  </div>

  {skills.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-5">
      {skills.slice(0, 4).map((skill) => (
        <span
          key={skill}
          className="bg-gray-100 rounded-full px-3 py-1.5 text-xs text-gray-700"
        >
          {skill}
        </span>
      ))}

      {skills.length > 4 && (
        <span className="text-xs text-gray-400 px-2 py-1.5">
          +{skills.length - 4} daha
        </span>
      )}
    </div>
  )}

  <div className="mt-6">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-gray-500">
        Profil tamamlanma
      </span>

      <span className="text-sm font-semibold text-gray-900">
        {profileCompletion}%
      </span>
    </div>

    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-black rounded-full transition-all"
        style={{
          width: `${profileCompletion}%`,
        }}
      />
    </div>
  </div>
</div>

      {/* Analytics Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <InfoCard
          title="Teklif Başarısı"
          value="%25 dönüş"
          icon={<Send />}
        />

        <InfoCard
          title="Aktif Durum"
          value="Online"
          icon={<TrendingUp />}
        />
      </div>

      {/* Recommended Projects */}
      <div
        className="
          bg-white
          rounded-2xl
          p-6
          shadow-sm
          hover:shadow-md
          transition
        "
      >
        <h2 className="font-semibold mb-5">
          Sana Önerilen Projeler
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          <Recommendation
            title="Fintech Mobile App"
            price="₺25.000"
          />

          <Recommendation
            title="SaaS Dashboard UX"
            price="₺15.000"
          />

          <Recommendation
            title="Landing Page"
            price="₺8.000"
          />
        </div>
      </div>

      {/* Activity */}
      <div
        className="
          bg-white
          rounded-2xl
          p-6
          shadow-sm
          hover:shadow-md
          transition
        "
      >
        <h2 className="font-semibold mb-6">
          Son Aktiviteler
        </h2>

        <Timeline
          icon={<CheckCircle2 />}
          title="Proje tamamlandı"
          desc="Fintech Dashboard teslim edildi"
          time="2 saat önce"
        />

        <Timeline
          icon={<MessageSquare />}
          title="Yeni mesaj"
          desc="Müşteri revize gönderdi"
          time="15 dakika önce"
        />

        <Timeline
          icon={<TrendingUp />}
          title="Profil yükseldi"
          desc="+24 yeni görüntülenme"
          time="Dün"
        />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        bg-white
        rounded-2xl
        p-5
        shadow-sm
        hover:shadow-md
        transition
      "
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <h3 className="text-3xl font-semibold mt-2">
            {value}
          </h3>

          <p className="text-xs text-green-600 mt-2">
            {change}
          </p>
        </div>

        <div
          className="
            bg-gray-100
            w-10
            h-10
            rounded-xl
            flex
            items-center
            justify-center
            shrink-0
          "
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Project({
  title,
  company,
  status,
  progress,
}: {
  title: string;
  company: string;
  status: string;
  progress: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex justify-between">
        <div>
          <h3 className="font-medium">
            {title}
          </h3>

          <p className="text-sm text-gray-500">
            {company}
          </p>
        </div>

        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">
          {status}
        </span>
      </div>

      <div className="mt-3 h-2 bg-gray-100 rounded-full">
        <div
          className="h-full bg-black rounded-full"
          style={{ width: progress }}
        />
      </div>
    </div>
  );
}

function LiveItem({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 mb-5">
      <div className="bg-gray-100 p-2 rounded-lg">
        {icon}
      </div>

      <div>
        <p className="font-medium text-sm">
          {title}
        </p>

        <p className="text-xs text-gray-500">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        bg-white
        rounded-2xl
        p-5
        shadow-sm
      "
    >
      <div className="flex gap-3">
        <div className="bg-gray-100 p-3 rounded-xl">
          {icon}
        </div>

        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="font-semibold mt-1">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function Recommendation({
  title,
  price,
}: {
  title: string;
  price: string;
}) {
  return (
    <div
      className="
        bg-gray-50
        rounded-xl
        p-4
        hover:bg-gray-100
        transition
      "
    >
      <h3 className="font-medium">
        {title}
      </h3>

      <p className="text-sm text-gray-500 mt-2">
        {price}
      </p>

      <button className="text-sm text-blue-600 mt-3">
        İncele
      </button>
    </div>
  );
}

function Timeline({
  icon,
  title,
  desc,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  time: string;
}) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="bg-gray-100 p-2 rounded-full h-fit">
        {icon}
      </div>

      <div>
        <p className="font-medium text-sm">
          {title}
        </p>

        <p className="text-sm text-gray-500">
          {desc}
        </p>

        <p className="text-xs text-gray-400 mt-1">
          {time}
        </p>
      </div>
    </div>
  );
}