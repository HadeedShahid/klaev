"use client";

import { Upload } from "lucide-react";
import { useActionState, useId, useRef } from "react";

import { uploadReceiptAsAdmin, type ActionState } from "@/app/actions/admin";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// For a receipt the customer sent on WhatsApp or showed in person: pick the file and it's kept with
// the order, the same way as one they uploaded.
export function AdminReceiptUpload({ number }: { number: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadReceiptAsAdmin.bind(null, number), null);
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
