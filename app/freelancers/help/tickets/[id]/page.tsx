"use client";

import { useParams } from "next/navigation";
import TicketDetail from "@/components/support/TicketDetail";

export default function FreelancerTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <TicketDetail ticketId={id} backHref="/freelancers/help" />
      </div>
    </div>
  );
}
