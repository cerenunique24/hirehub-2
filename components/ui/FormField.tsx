"use client";

import { useId, type ReactNode } from "react";
export function FormField({label,error,children}:{label:string;error?:string;children:(props:{id:string;"aria-invalid"?:true;"aria-describedby"?:string})=>ReactNode}) {
  const id=useId();const errorId=id+"-error";
  return <div><label htmlFor={id} className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-primary)]">{label}</label>{children({id,"aria-invalid":error?true:undefined,"aria-describedby":error?errorId:undefined})}{error&&<p id={errorId} className="cc-body-sm mt-[var(--rhythm-label-gap)] text-[var(--color-error-600)]">{error}</p>}</div>;
}
