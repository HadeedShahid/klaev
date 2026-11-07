"use client";

import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { BusyLabel } from "@/components/ui/busy-label";
import { photoCopies } from "@/lib/photo-copies";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// Each photo is cut, in the browser, into the copies the store keeps (lib/photo-copies.ts). Then it's
// uploaded, one photo at a time, through `upload` (a server action bound to what the photo is for).
export function PhotoUploader({
  upload: send,
  multiple = true,
  label = "Add photos",
}: {
  upload: (form: FormData) => Promise<ActionState>;
  multiple?: boolean;
  label?: string;
}) {
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function upload(files: File[]) {
    setBusy(true);
    for (const [index, file] of files.entries()) {
      const counter = files.length > 1 ? ` ${index + 1} of ${files.length}` : "";
      try {
        setStatus({ text: `Preparing photo${counter}` });
        const form = await photoCopies(file);
        setStatus({ text: `Uploading photo${counter}` });
        const result = await send(form);
        if (result && "error" in result) {
          setStatus({ text: result.error, error: true });
          break;
        }
        setStatus({ text: files.length > 1 ? `${index + 1} of ${files.length} photos added.` : result && "done" in result ? result.done : "Photo added." });
      } catch {
        setStatus({ text: `${file.name} couldn't be read. Use a JPEG, PNG, WebP or HEIC photo.`, error: true });
        break;
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) void upload(files);
        }}
      />
      <label htmlFor={id} aria-busy={busy} className={cn(quietPill, "h-9 cursor-pointer", busy && "pointer-events-none")}>
        <BusyLabel busy={busy} busyText="Uploading">
          <ImagePlus className="size-4" strokeWidth={1.8} aria-hidden />
          {label}
        </BusyLabel>
      </label>
      {status ? (
        <p role={status.error ? "alert" : "status"} className={cn("text-sm", status.error ? "text-destructive" : "text-muted-foreground")}>
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
