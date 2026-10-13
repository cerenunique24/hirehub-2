"use client";
import Image from "next/image";
import { useState } from "react";
import { displayInitial } from "@/lib/utils/displayName";
export function ProfileAvatar({src,name,className=""}:{src?:string|null;name:string;className?:string}) {
 const [failedSrc,setFailedSrc]=useState<string|null>(null);
 return <span className={className}>{src && failedSrc!==src ? <Image unoptimized src={src} alt="" fill sizes="80px" className="object-cover" onError={()=>setFailedSrc(src)} /> : <span aria-hidden="true">{displayInitial({first_name:name})}</span>}</span>;
}
