import type {ReactNode} from "react";
import {MobileSidebarProvider} from "./MobileSidebarContext";
import AppViewport from "./AppViewport";
import styles from "./AppShell.module.css";
export function AppShell({sidebar,navbar,children,role}:{sidebar:ReactNode;navbar:ReactNode;children:ReactNode;role:"client"|"freelancer"}) {
 return <MobileSidebarProvider><div className={styles.frame}>{sidebar}<div className={styles.column}>{navbar}<AppViewport role={role}>{children}</AppViewport></div></div></MobileSidebarProvider>;
}
