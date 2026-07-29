import {
    LucideIcon,
  } from "lucide-react";
  
  
  type StatCardProps = {
    title:string;
    value:string;
    description:string;
    icon:LucideIcon;
  };
  
  
  export default function StatCard({
    title,
    value,
    description,
    icon:Icon,
  }:StatCardProps){
  
    return (
  
      <div
        className="
        bg-white
        border
        border-gray-200
        rounded-3xl
        p-6
        "
      >
  
        <div className="flex items-center justify-between">
  
  
          <div>
  
            <p className="text-sm text-gray-500">
              {title}
            </p>
  
  
            <h2 className="text-3xl font-bold mt-3">
              {value}
            </h2>
  
  
            <p className="text-sm text-gray-400 mt-2">
              {description}
            </p>
  
          </div>
  
  
          <div
            className="
            w-12
            h-12
            rounded-2xl
            bg-gray-100
            flex
            items-center
            justify-center
            "
          >
  
            <Icon size={22}/>
  
          </div>
  
  
        </div>
  
  
      </div>
  
    );
  }