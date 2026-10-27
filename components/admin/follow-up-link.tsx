"use client";

import { MessageCircle } from "lucide-react";

import { contactedAction } from "@/app/actions/admin-orders";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// Opens the WhatsApp follow-up and notes that it was sent, so nobody sends it twice.
export function FollowUpLink({ id, href, contacted }: { id: number; href: string; contacted: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={() => void contactedAction(id)} className={cn(quietPill, "h-9", contacted && "bg-transparent text-muted-foreground")}>
      <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden />
      {contacted ? "Message again" : "WhatsApp"}
    </a>
  );
}
