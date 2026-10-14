import FreelancerSupportCenter from "@/components/support/FreelancerSupportCenter";
import { SUPPORT_TOPICS } from "@/lib/supportPresentation";
import { notFound } from "next/navigation";
export default async function Page({params}:{params:Promise<{topic:string}>}){const {topic}=await params;const item=SUPPORT_TOPICS.find(item=>item.id===topic);if(!item)notFound();return <FreelancerSupportCenter key={item.id} view="topic" initialTopic={item.id} />;}
