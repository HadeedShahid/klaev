"use client";

import { Upload } from "lucide-react";
import { useActionState, useId, useRef } from "react";

import { finishReceiptUploadAsAdmin, startReceiptUploadAsAdmin, uploadReceiptAsAdmin, type ActionState } from "@/app/actions/admin";
import { MAX_RECEIPT_BYTES, MAX_RECEIPT_MB } from "@/lib/receipt-limit";
import { sendReceipt } from "@/lib/send-receipt";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// For a receipt the customer sent on WhatsApp or showed in person: pick the file and it's kept with
// the order, sent straight to storage as it is, like one they uploaded. A file over the limit, or a
// failed upload, is a message rather than a broken page, as on the order page.
export function AdminReceiptUpload({ number }: { number: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (previous, formData) => {
    const file = formData.get("receipt");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose the screenshot first." };
    if (file.size > MAX_RECEIPT_BYTES) return { error: `That file is over ${MAX_RECEIPT_MB} MB. Save a smaller copy and upload that.` };
    return sendReceipt<ActionState>(file, {
      start: () => startReceiptUploadAsAdmin(number, { name: file.name, type: file.type, size: file.size }),
      finish: (key) => finishReceiptUploadAsAdmin(number, key),
      throughStore: () => uploadReceiptAsAdmin(number, previous, formData),
      failed: (message) => ({ error: message.replace(", or send the screenshot on WhatsApp", "") }),
    });
  }, null);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  return (
    <form ref={form} action={action} className="flex flex-wrap items-center gap-3">
      <input
        id={id}
        name="receipt"
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={() => form.current?.requestSubmit()}
      />
      <label htmlFor={id} className={cn(quietPill, "h-9 cursor-pointer", pending && "pointer-events-none text-muted-foreground")}>
        <Upload className="size-4" strokeWidth={1.8} aria-hidden />
        {pending ? "Uploading" : "Upload a receipt"}
      </label>
      {state ? (
        <p role={"error" in state ? "alert" : "status"} className={cn("text-sm", "error" in state ? "text-destructive" : "text-muted-foreground")}>
          {"error" in state ? state.error : state.done}
        </p>
      ) : null}
    </form>
  );
}
