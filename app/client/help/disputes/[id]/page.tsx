"use client";

import { useParams } from "next/navigation";
import DisputeDetail from "@/components/support/DisputeDetail";

export default function ClientDisputeDetailPage() {
  const params = useParams();
  return <DisputeDetail disputeId={params.id as string} backHref="/client/help" />;
}
