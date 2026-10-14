import ProjectDetailsPage from "@/app/register/client/setup/details/page";
import styles from "@/components/layout/AppShell.module.css";
/** Existing shared form; only its embedding geometry changes inside the product shell. */
export default function ClientProjectDetailsPage(){return <div className={styles.embeddedPage}><ProjectDetailsPage/></div>;}
