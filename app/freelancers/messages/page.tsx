"use client";

import { useState } from "react";


export default function MessagesPage() {

  const [activeTab, setActiveTab] = useState("müşteri");


  const customerMessages = [
    {
      name: "Nova Teknoloji",
      project: "Mobil Uygulama Tasarımı",
      message: "Tasarım dosyalarını inceledik.",
      time: "10:32",
      avatar: "/avatars/avatar-1.jpg",
      unread: 2,
    },
    {
      name: "Porta Yapı",
      project: "Kurumsal Web Sitesi",
      message: "Yeni revizyonları gönderdik.",
      time: "Dün",
      avatar: "/avatars/avatar-2.jpg",
      unread: 0,
    },
  ];


  const teamMessages = [
    {
      name: "Mobil App Ekibi",
      project: "Nova Projesi • 4 Üye",
      message: "Frontend tarafındaki görev tamamlandı.",
      time: "11:15",
      avatar: "/avatars/avatar-3.jpg",
      unread: 3,
    },
    {
      name: "SaaS Tasarım Ekibi",
      project: "Cloudify • 5 Üye",
      message: "Toplantı notlarını paylaştım.",
      time: "Dün",
      avatar: "/avatars/avatar-4.jpg",
      unread: 0,
    },
  ];


  const systemMessages = [
    {
      name: "HireHub",
      project: "Sistem Bildirimi",
      message: "Teklifin müşteri tarafından kabul edildi.",
      time: "Bugün",
      avatar: "/avatars/logo.png",
      unread: 1,
    },
    {
      name: "HireHub",
      project: "Proje Durumu",
      message: "Proje teslim tarihi güncellendi.",
      time: "Pazartesi",
      avatar: "/avatars/logo.png",
      unread: 0,
    },
  ];



  const messages =
    activeTab === "müşteri"
      ? customerMessages
      : activeTab === "ekip"
      ? teamMessages
      : systemMessages;



  const chatMessages = [
    {
      sender: "client",
      text: "Merhaba, tasarım dosyalarını inceledik.",
      time: "10:20",
    },
    {
      sender: "me",
      text: "Harika, geri bildirimlerinizi bekliyorum.",
      time: "10:25",
    },
    {
      sender: "client",
      text: "Renk alternatifleri üzerinde değişiklik istiyoruz.",
      time: "10:32",
    },
  ];



  return (

    <main className="p-8 w-full">


      <div className="mb-6">

        <h1 className="text-2xl font-semibold text-gray-900">
          Mesajlar
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Müşteri, ekip ve sistem bildirimlerini yönet.
        </p>

      </div>




      <div
        className="
          w-full
          h-[calc(100vh-220px)]
          bg-white
          border
          border-gray-200
          rounded-2xl
          overflow-hidden
          flex
        "
      >




        {/* SOL PANEL */}

        <div
          className="
            w-[340px]
            border-r
            border-gray-200
            flex
            flex-col
          "
        >



          {/* Tabs */}

          <div
            className="
              p-4
              border-b
              border-gray-200
              flex
              gap-2
            "
          >

            {[
              {
                label:"Müşteri",
                value:"müşteri"
              },
              {
                label:"Ekip",
                value:"ekip"
              },
              {
                label:"Sistem",
                value:"sistem"
              },
            ].map((tab)=>(
              
              <button
                key={tab.value}
                onClick={()=>setActiveTab(tab.value)}
                className={`
                  px-3
                  py-2
                  rounded-xl
                  text-xs
                  font-medium
                  ${
                    activeTab === tab.value
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600"
                  }
                `}
              >
                {tab.label}
              </button>

            ))}


          </div>





          {/* Search */}

          <div className="p-4">

            <input
              placeholder="Mesajlarda ara..."
              className="
                w-full
                px-4
                py-2.5
                rounded-xl
                bg-gray-100
                text-sm
                outline-none
              "
            />

          </div>





          {/* Liste */}

          <div className="flex-1 overflow-y-auto">


            {messages.map((item,index)=>(

              <div
                key={index}
                className="
                  p-4
                  flex
                  gap-3
                  hover:bg-gray-50
                  cursor-pointer
                  border-b
                  border-gray-100
                "
              >


                <img
                  src={item.avatar}
                  alt={item.name}
                  className="
                    w-11
                    h-11
                    rounded-full
                    object-cover
                  "
                />



                <div className="flex-1">

                  <div className="flex justify-between">

                    <h3 className="text-sm font-semibold">
                      {item.name}
                    </h3>


                    <span className="text-xs text-gray-400">
                      {item.time}
                    </span>

                  </div>


                  <p className="text-xs text-gray-500 mt-1">
                    {item.project}
                  </p>


                  <p className="text-sm text-gray-600 mt-2 truncate">
                    {item.message}
                  </p>


                </div>


                {
                  item.unread > 0 &&

                  <span
                    className="
                      w-5
                      h-5
                      rounded-full
                      bg-black
                      text-white
                      text-xs
                      flex
                      items-center
                      justify-center
                    "
                  >
                    {item.unread}
                  </span>
                }


              </div>


            ))}


          </div>


        </div>







        {/* CHAT */}

        <div className="flex-1 flex flex-col">


          <div
            className="
              p-5
              border-b
              border-gray-200
              flex
              justify-between
              items-center
            "
          >

            <div>

              <h2 className="font-semibold">
                Nova Teknoloji
              </h2>

              <p className="text-sm text-gray-500">
                Mobil Uygulama Tasarımı
              </p>

            </div>


            <button
              className="
                px-4
                py-2
                rounded-xl
                bg-gray-100
                text-sm
              "
            >
              Projeyi Gör
            </button>


          </div>






          <div
            className="
              flex-1
              p-6
              space-y-4
              bg-gray-50
              overflow-y-auto
            "
          >

            {chatMessages.map((message,index)=>(

              <div
                key={index}
                className={`
                  flex
                  ${
                    message.sender==="me"
                    ?"justify-end"
                    :"justify-start"
                  }
                `}
              >

                <div
                  className={`
                    max-w-[420px]
                    px-4
                    py-3
                    rounded-2xl
                    text-sm
                    ${
                      message.sender==="me"
                      ?"bg-black text-white"
                      :"bg-white border border-gray-200"
                    }
                  `}
                >

                  {message.text}

                  <span className="block text-[11px] mt-2 opacity-60">
                    {message.time}
                  </span>

                </div>

              </div>

            ))}

          </div>






          <div
            className="
              p-5
              border-t
              border-gray-200
              flex
              gap-3
            "
          >

            <input
              placeholder="Mesaj yaz..."
              className="
                flex-1
                px-4
                py-3
                rounded-xl
                bg-gray-100
                text-sm
                outline-none
              "
            />


            <button
              className="
                px-6
                rounded-xl
                bg-black
                text-white
                text-sm
              "
            >
              Gönder
            </button>


          </div>


        </div>



      </div>


    </main>

  );
}