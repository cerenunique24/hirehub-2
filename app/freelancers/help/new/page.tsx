import FreelancerSupportCenter from "@/components/support/FreelancerSupportCenter";
import { topicFor } from "@/lib/supportPresentation";
export default async function Page({searchParams}:{searchParams:Promise<{topic?:string}>}){const params=await searchParams;return <FreelancerSupportCenter view="new" initialTopic={topicFor(typeof params.topic === "string" ? params.topic : "technical").id} />;}
