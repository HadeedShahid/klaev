"use client";

import { Upload } from "lucide-react";
import { useActionState, useId, useRef } from "react";

import { finishReceiptUploadAsAdmin, startReceiptUploadAsAdmin, uploadReceiptAsAdmin, type ActionState } from "@/app/actions/admin";
import { BusyLabel } from "@/components/ui/busy-label";
import type { ReceiptKind } from "@/lib/db/schema";
import { MAX_RECEIPT_BYTES, MAX_RECEIPT_MB } from "@/lib/receipt-limit";
import { sendReceipt } from "@/lib/send-receipt";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// A file kept with the order, picked and sent straight to storage as it is: a receipt the customer
// sent on WhatsApp or showed in person, or one of the admin's own records (`kind`: the shipping
// receipt, the courier's payout voucher, the payout screenshot). A file over the limit, or a failed
// upload, is a message rather than a broken page, as on the order page.
export function AdminReceiptUpload({ number, kind = "payment", label = "Upload a receipt" }: { number: number; kind?: ReceiptKind; label?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (previous, formData) => {
    const file = formData.get("receipt");
    if (!(file instanceof File) || file.size === 0) return { error: kind === "payment" ? "Choose the screenshot first." : "Choose the file first." };
    if (file.size > MAX_RECEIPT_BYTES) return { error: `That file is over ${MAX_RECEIPT_MB} MB. Save a smaller copy and upload that.` };
    return sendReceipt<ActionState>(file, {
      start: () => startReceiptUploadAsAdmin(number, { name: file.name, type: file.type, size: file.size }, kind),
      finish: (key) => finishReceiptUploadAsAdmin(number, key, kind),
      throughStore: () => uploadReceiptAsAdmin(number, previous, formData),
      failed: (message) => ({ error: message.replace(", or send the screenshot on WhatsApp", "") }),
    });
  }, null);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  return (
    <form ref={form} action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="kind" value={kind} />
      <input
        id={id}
        name="receipt"
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={() => form.current?.requestSubmit()}
      />
      <label htmlFor={id} aria-busy={pending} className={cn(quietPill, "h-9 cursor-pointer", pending && "pointer-events-none")}>
        <BusyLabel busy={pending} busyText="Uploading">
          <Upload className="size-4" strokeWidth={1.8} aria-hidden />
          {label}
        </BusyLabel>
      </label>
      {state ? (
        <p role={"error" in state ? "alert" : "status"} className={cn("text-sm", "error" in state ? "text-destructive" : "text-muted-foreground")}>
          {"error" in state ? state.error : state.done}
        </p>
      ) : null}
    </form>
  );
}
