import type {ReactNode,Ref} from "react";
import styles from "./PanelNavbar.module.css";
/** Presentation only: each role owns its existing queries, menus and destinations. */
export function PanelNavbarFrame({children,ref}:{children:ReactNode;ref?:Ref<HTMLElement>}) {return <header ref={ref} className={styles.root}>{children}</header>;}
