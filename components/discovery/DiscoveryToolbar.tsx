import type {ReactNode} from "react";
import styles from "./Discovery.module.css";
export function DiscoveryToolbar({children,label}:{children:ReactNode;label:string}){return <section className={styles.toolbar} aria-label={label}>{children}</section>;}
