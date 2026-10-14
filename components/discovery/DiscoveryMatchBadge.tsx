import {Sparkles} from "lucide-react";
import {Badge} from "@/components/ui/Badge";
import styles from "./Discovery.module.css";
export function DiscoveryMatchBadge({score}:{score:number}){if(!Number.isFinite(score)||score<0||score>100)return null;return <Badge tone="ai" className={["gap-1",styles.match].join(" ")}><Sparkles className="h-3 w-3"/>%{Math.round(score)} eşleşme</Badge>;}
