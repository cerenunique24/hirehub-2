"use client";

import {
  Search,
  Bell,
  MessageCircle,
} from "lucide-react";


export default function DashboardNavbar() {

  return (
    <div className="
      mb-8
      flex
      items-center
      justify-between
    ">


      {/* Search */}

      <div className="
        flex
        w-[350px]
        items-center
        gap-3
        rounded-xl
        bg-white
        px-4
        py-3
        border
        border-gray-100
      ">

        <Search size={18} className="text-gray-400"/>

        <input
          placeholder="Search projects..."
          className="
            w-full
            bg-transparent
            outline-none
            text-sm
          "
        />

      </div>




      {/* Right */}

      <div className="
        flex
        items-center
        gap-4
      ">


        <button className="
          relative
          rounded-xl
          bg-white
          p-3
          border
          border-gray-100
        ">

          <MessageCircle size={20}/>

          <span className="
            absolute
            right-2
            top-2
            h-2
            w-2
            rounded-full
            bg-black
          "/>

        </button>



        <button className="
          relative
          rounded-xl
          bg-white
          p-3
          border
          border-gray-100
        ">

          <Bell size={20}/>

          <span className="
            absolute
            right-2
            top-2
            h-2
            w-2
            rounded-full
            bg-red-500
          "/>

        </button>



        <div className="
          flex
          items-center
          gap-3
          rounded-xl
          bg-white
          px-4
          py-2
          border
          border-gray-100
        ">

          <div className="
            h-9
            w-9
            rounded-full
            bg-black
            text-white
            flex
            items-center
            justify-center
            text-sm
          ">
            C
          </div>


          <div>
            <p className="
              text-sm
              font-medium
            ">
              Ceren
            </p>

            <p className="
              text-xs
              text-gray-500
            ">
              Designer
            </p>
          </div>

        </div>


      </div>


    </div>
  );
}