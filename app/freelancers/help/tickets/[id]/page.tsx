"use client";

import { useParams } from "next/navigation";
import TicketDetail from "@/components/support/TicketDetail";

export default function FreelancerTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <>
        <TicketDetail ticketId={id} backHref="/freelancers/help" />
      </>
  );
}
