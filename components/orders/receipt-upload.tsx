"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, type ChangeEvent } from "react";

import { uploadReceipt, type ReceiptState } from "@/app/actions/receipts";
import { pill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// Choosing the screenshot uploads it straight away: one tap to open the photos, one to pick.
export function ReceiptUpload({ token, received, whatsappHref }: { token: string; received: boolean; whatsappHref: string }) {
  const [state, formAction, pending] = useActionState<ReceiptState, FormData>(uploadReceipt.bind(null, token), {
    status: received ? "received" : "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const done = state.status === "received";

  // The page above says where the order stands, so it re-renders once the receipt is in.
  useEffect(() => {
    if (done && !received) router.refresh();
  }, [done, received, router]);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files?.length) formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div role="status" className="text-sm empty:hidden">
        {pending ? (
          <p className="font-medium">Uploading</p>
        ) : done ? (
          // The page's lead says it on screen; this tells screen readers the upload worked.
          <p className="sr-only">Receipt received</p>
        ) : state.status === "error" ? (
          <p className="text-destructive">{state.message}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label
          className={cn(
            pill,
            "relative cursor-pointer px-5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
            done && "bg-muted text-foreground hover:bg-accent",
            pending && "pointer-events-none bg-muted text-muted-foreground",
          )}
        >
          {done ? "Upload another" : "Upload screenshot"}
          <input
            type="file"
            name="receipt"
            accept="image/*,application/pdf"
            aria-label="Upload screenshot"
            onChange={choose}
            disabled={pending}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <a
          href={whatsappHref}
          className="group inline-flex h-12 items-center gap-0.5 text-[0.9375rem] font-medium underline-offset-[0.2em] hover:underline"
        >
          Send it on WhatsApp
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.6} aria-hidden />
        </a>
      </div>
    </form>
  );
}
