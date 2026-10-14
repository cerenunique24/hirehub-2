"use client";

import { useParams } from "next/navigation";
import TicketDetail from "@/components/support/TicketDetail";

export default function ClientTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-3xl">
        <TicketDetail ticketId={id} backHref="/client/help" />
      </div>
    </div>
  );
}
