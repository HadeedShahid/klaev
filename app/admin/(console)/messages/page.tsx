import { Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { messageAction } from "@/app/actions/admin-content";
import { ActionDialog } from "@/components/admin/action-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin/auth";
import { ago, localPhone, whatsappTo } from "@/lib/admin/format";
import { getDb } from "@/lib/db";
import { listMessages, SUBJECT_LABELS } from "@/lib/messages";
import { forgetOldData } from "@/lib/retention";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

// What came in through the contact form: waiting first, newest first, each with a one-tap reply.
export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin();
  const handled = (await searchParams).tab === "handled";
  const db = await getDb();
  await forgetOldData(db);
  const rows = await listMessages(db, { handled });
  return (
    <>
      <PageHeader title="Messages" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav aria-label="Messages" className="flex gap-1">
          {[
            { key: "waiting", label: "Waiting", href: "/admin/messages" },
            { key: "handled", label: "Handled", href: "/admin/messages?tab=handled" },
          ].map((tab) => {
            const active = (tab.key === "handled") === handled;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn("rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-muted font-medium text-foreground")}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {rows.length === 0 ? (
          <Card className="items-start gap-2 px-6 py-8">
            <p className="font-medium">{handled ? "Nothing handled yet" : "Nothing waiting"}</p>
            <p className="text-sm text-muted-foreground">Messages from the contact form on the store land here.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((message) => {
              const first = message.name.split(/\s+/)[0];
              return (
                <li key={message.id}>
                  <Card className="gap-3 px-4 py-4 md:px-6" data-testid={`message-${message.id}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{message.name}</span>
                        <Badge variant="outline">{SUBJECT_LABELS[message.subject]}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">{ago(message.createdAt)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground tabular-nums">{[message.phone ? localPhone(message.phone) : null, message.email].filter(Boolean).join(" · ")}</p>
                    <p className="max-w-[70ch] text-[0.9375rem] leading-relaxed whitespace-pre-line">{message.body}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {message.phone ? (
                        <a href={whatsappTo(message.phone, `Assalam o Alaikum ${first}, this is Klaev, about your message.`)} target="_blank" rel="noreferrer" className={cn(quietPill, "h-9")}>
                          <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden />
                          WhatsApp {first}
                        </a>
                      ) : null}
                      {message.email ? (
                        <a href={`mailto:${message.email}?subject=${encodeURIComponent("Your message to Klaev")}`} className={cn(quietPill, "h-9")}>
                          <Mail className="size-4" strokeWidth={1.8} aria-hidden />
                          Email {first}
                        </a>
                      ) : null}
                      <ActionDialog
                        action={messageAction}
                        label={handled ? "Move back to waiting" : "Mark handled"}
                        title={handled ? "Move it back to waiting?" : `Mark ${first}'s message handled?`}
                        hidden={{ id: message.id, intent: handled ? "waiting" : "handled" }}
                        submit={handled ? "Move it back" : "Mark handled"}
                        variant="ghost"
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
