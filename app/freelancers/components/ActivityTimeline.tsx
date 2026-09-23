"use client";

import {
  CheckCircle2,
  MessageSquare,
  Eye,
  Wallet,
  FileText,
} from "lucide-react";


const activities = [
  {
    icon: CheckCircle2,
    title: "Proje tamamlandı",
    description: "Fintech Dashboard UI Design teslim edildi.",
    detail: "Albaraka • ₺18.500 ödeme alındı",
    time: "2 saat önce",
    type: "success",
  },
  {
    icon: MessageSquare,
    title: "Yeni mesaj aldın",
    description: "Müşteri revize dosyasını gönderdi.",
    detail: "Mobil Uygulama Tasarımı",
    time: "15 dakika önce",
    type: "message",
  },
  {
    icon: Eye,
    title: "Profil görüntülenmen arttı",
    description: "Son 24 saatte yeni ziyaretçiler geldi.",
    detail: "+24 profil görüntülenmesi",
    time: "Dün",
    type: "view",
  },
  {
    icon: FileText,
    title: "Yeni teklif gönderildi",
    description: "SaaS Dashboard projesine başvurdun.",
    detail: "Teklif durumu: Beklemede",
    time: "2 gün önce",
    type: "proposal",
  },
];


export default function ActivityTimeline() {


  return (

    <div className="bg-white rounded-xl border p-5">


      <div className="flex justify-between items-center mb-6">

        <h2 className="font-semibold text-gray-900">
          Son Aktiviteler
        </h2>


        <button className="text-sm text-blue-600">
          Tümünü Gör
        </button>

      </div>




      <div className="relative">


        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />



        <div className="space-y-6">


          {activities.map((item,index)=>{


            const Icon = item.icon;


            return (

              <div 
                key={index}
                className="relative flex gap-4"
              >


                <div className="
                  relative z-10
                  w-10 h-10
                  rounded-full
                  bg-gray-100
                  flex items-center justify-center
                ">

                  <Icon size={18}/>

                </div>




                <div className="flex-1">


                  <div className="flex justify-between">


                    <h3 className="font-medium text-gray-900">
                      {item.title}
                    </h3>


                    <span className="text-xs text-gray-400">
                      {item.time}
                    </span>


                  </div>




                  <p className="text-sm text-gray-600 mt-1">
                    {item.description}
                  </p>



                  <p className="text-xs text-gray-400 mt-2">
                    {item.detail}
                  </p>



                </div>


              </div>

            );


          })}



        </div>


      </div>



    </div>

  );

}