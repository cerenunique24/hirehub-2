"use client";

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
  Plus,
  UserCheck,
} from "lucide-react";


export default function FreelancerDashboard() {

  return (

    <div className="space-y-6">


      {/* Header */}

      <div className="flex justify-between items-start">

        <div>

          <h1 className="text-2xl font-semibold text-gray-900">
            Hoş geldin, Muhammed 👋
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Freelancer hesabının performansını ve projelerini buradan yönetebilirsin.
          </p>

        </div>


        <button className="
        bg-black 
        text-white 
        px-5 
        py-2.5 
        rounded-xl 
        text-sm
        hover:opacity-90
        transition
        ">
          + Yeni Teklif
        </button>


      </div>







      {/* KPI */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">


        <KpiCard
          title="Aktif Projeler"
          value="6"
          change="+2 bu ay"
          icon={<Briefcase/>}
        />


        <KpiCard
          title="Bekleyen Teklif"
          value="12"
          change="4 yeni"
          icon={<Clock/>}
        />


        <KpiCard
          title="Toplam Kazanç"
          value="₺48.500"
          change="+18%"
          icon={<DollarSign/>}
        />


        <KpiCard
          title="Profil Ziyareti"
          value="324"
          change="+42%"
          icon={<Users/>}
        />


      </div>








      {/* Main */}

      <div className="grid lg:grid-cols-3 gap-6">



        {/* Projects */}


        <div className="
        lg:col-span-2
        bg-white
        rounded-2xl
        p-6
        shadow-sm
        hover:shadow-md
        transition
        ">


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


        <div className="
        bg-white
        rounded-2xl
        p-6
        shadow-sm
        hover:shadow-md
        transition
        ">


          <h2 className="font-semibold mb-6">
            Canlı Durum
          </h2>


          <LiveItem
          icon={<MessageSquare/>}
          title="Mesajlar"
          value="4 yeni mesaj"
          />


          <LiveItem
          icon={<Eye/>}
          title="Profil"
          value="+24 ziyaret"
          />


          <LiveItem
          icon={<CalendarDays/>}
          title="Teslim"
          value="2 yaklaşan görev"
          />


        </div>



      </div>









      {/* Analytics Cards */}


      <div className="grid md:grid-cols-3 gap-6">


        <InfoCard
        title="Profil Gücü"
        value="86%"
        icon={<UserCheck/>}
        />


        <InfoCard
        title="Teklif Başarısı"
        value="%25 dönüş"
        icon={<Send/>}
        />


        <InfoCard
        title="Aktif Durum"
        value="Online"
        icon={<TrendingUp/>}
        />


      </div>









      {/* Recommended Projects */}


      <div className="
      bg-white
      rounded-2xl
      p-6
      shadow-sm
      hover:shadow-md
      transition
      ">


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


      <div className="
      bg-white
      rounded-2xl
      p-6
      shadow-sm
      hover:shadow-md
      transition
      ">


        <h2 className="font-semibold mb-6">
          Son Aktiviteler
        </h2>


        <Timeline
        icon={<CheckCircle2/>}
        title="Proje tamamlandı"
        desc="Fintech Dashboard teslim edildi"
        time="2 saat önce"
        />


        <Timeline
        icon={<MessageSquare/>}
        title="Yeni mesaj"
        desc="Müşteri revize gönderdi"
        time="15 dakika önce"
        />


        <Timeline
        icon={<TrendingUp/>}
        title="Profil yükseldi"
        desc="+24 yeni görüntülenme"
        time="Dün"
        />


      </div>


    </div>

  );

}







function KpiCard({title,value,change,icon}:any){

return(

<div className="
bg-white
rounded-2xl
p-5
shadow-sm
hover:shadow-md
transition
">


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


<div className="
bg-gray-100
w-10
h-10
rounded-xl
flex
items-center
justify-center
shrink-0
">
  {icon}
</div>


</div>


</div>

)

}







function Project({title,company,status,progress}:any){

return(

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
style={{width:progress}}
/>


</div>


</div>

)

}







function LiveItem({icon,title,value}:any){

return(

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

)

}







function InfoCard({title,value,icon}:any){

return(

<div className="
bg-white
rounded-2xl
p-5
shadow-sm
">


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

)

}







function Recommendation({title,price}:any){

return(

<div className="
bg-gray-50
rounded-xl
p-4
hover:bg-gray-100
transition
">


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

)

}







function Timeline({icon,title,desc,time}:any){

return(

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

)

}