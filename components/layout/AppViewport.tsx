"use client";
import {useEffect,useRef,type ReactNode} from "react";
import {usePathname} from "next/navigation";
import {useMobileSidebar} from "./MobileSidebarContext";
import PageContainer from "./PageContainer";
import styles from "./AppShell.module.css";
export default function AppViewport({children,role="freelancer"}:{children:ReactNode;role?:"client"|"freelancer"}) {
 const ref=useRef<HTMLElement>(null),pathname=usePathname(),{open}=useMobileSidebar();
 useEffect(()=>{ref.current?.scrollTo({top:0,left:0});},[pathname]);
 return <main ref={ref} className={[styles.viewport,open?styles.drawerOpen:""].join(" ")} data-app-viewport data-freelancer-viewport={role==="freelancer"?true:undefined} data-client-viewport={role==="client"?true:undefined}><PageContainer>{children}</PageContainer></main>;
}
