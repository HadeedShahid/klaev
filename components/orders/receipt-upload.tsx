"use client";

import { ChevronRight, CircleAlert, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, type ChangeEvent } from "react";

import { finishReceiptUpload, startReceiptUpload, uploadReceipt, type ReceiptState } from "@/app/actions/receipts";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { BusyLabel } from "@/components/ui/busy-label";
import { MAX_RECEIPT_BYTES, RECEIPT_TOO_BIG } from "@/lib/receipt-limit";
import { sendReceipt } from "@/lib/send-receipt";
import { pill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// `justSent` marks a receipt sent from this page just now, as against one already on the order.
type UploadState = ReceiptState & { justSent?: boolean };

// Choosing the screenshot uploads it straight away: one tap to open the photos, one to pick. It goes
// straight to storage as it is (lib/send-receipt.ts). A file over the limit is turned away before it
// uploads, and a failed upload says so here instead of taking the page down. Every upload that
// lands says so beside the button: the page's lead only changes for the first.
export function ReceiptUpload({ token, received, whatsappHref }: { token: string; received: boolean; whatsappHref: string }) {
  const [state, formAction, pending] = useActionState<UploadState, FormData>(
    async (previous, formData) => {
      const file = formData.get("receipt");
      if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose the screenshot first." };
      if (file.size > MAX_RECEIPT_BYTES) return { status: "error", message: RECEIPT_TOO_BIG };
      const result = await sendReceipt<ReceiptState>(file, {
        start: () => startReceiptUpload(token, { name: file.name, type: file.type, size: file.size }),
        finish: (key) => finishReceiptUpload(token, key),
        throughStore: () => uploadReceipt(token, previous, formData),
        failed: (message) => ({ status: "error", message }),
      });
      return result.status === "received" ? { ...result, justSent: true } : result;
    },
    { status: received ? "received" : "idle" },
  );
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
        {pending ? null : done && state.justSent ? (
          <Alert>
            <CircleCheck className="text-tone-green" strokeWidth={2} aria-hidden />
            <AlertTitle>Screenshot uploaded.</AlertTitle>
          </Alert>
        ) : done ? (
          // A receipt already on the order: the page's lead says so on screen, this tells screen readers.
          <p className="sr-only">Receipt received</p>
        ) : state.status === "error" ? (
          <Alert variant="error">
            <CircleAlert strokeWidth={2} aria-hidden />
            <AlertTitle className="font-normal">{state.message}</AlertTitle>
          </Alert>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label
          aria-busy={pending}
          className={cn(
            pill,
            "relative cursor-pointer px-5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
            done && "bg-muted text-foreground hover:bg-accent",
            pending && "pointer-events-none",
          )}
        >
          <BusyLabel busy={pending} busyText="Uploading">{done ? "Upload another" : "Upload screenshot"}</BusyLabel>
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
