"use client";

import { Upload } from "lucide-react";
import { useActionState, useId, useRef } from "react";

import { uploadReceiptAsAdmin, type ActionState } from "@/app/actions/admin";
import { MAX_UPLOAD_BYTES, shrinkImage } from "@/lib/shrink-image";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// For a receipt the customer sent on WhatsApp or showed in person: pick the file and it's kept with
// the order, the same way as one they uploaded. Big photos shrink first, and a failed upload is a
// message rather than a broken page, as on the order page.
export function AdminReceiptUpload({ number }: { number: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (previous, formData) => {
    const chosen = formData.get("receipt");
    if (chosen instanceof File) {
      const file = await shrinkImage(chosen);
      if (file.size > MAX_UPLOAD_BYTES) return { error: "That file is over 10 MB. Save a smaller copy and upload that." };
      formData.set("receipt", file);
    }
    try {
      return await uploadReceiptAsAdmin(number, previous, formData);
    } catch {
      return { error: "That didn't upload. Try again." };
    }
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
