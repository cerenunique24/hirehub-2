"use client";

import { useParams } from "next/navigation";
import DisputeDetail from "@/components/support/DisputeDetail";

export default function FreelancerDisputeDetailPage() {
  const params = useParams();
  return <DisputeDetail disputeId={params.id as string} backHref="/freelancers/help" />;
}
