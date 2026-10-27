"use client";

import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { MEDIA_FULL_WIDTH, MEDIA_WIDTHS } from "@/lib/media";
import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

const QUALITY = 0.82;

function draw(bitmap: ImageBitmap, width: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((bitmap.height * width) / bitmap.width);
  const context = canvas.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Chrome and Firefox write WebP themselves; Safari hands back a PNG, so there the encoder from
// Google's Squoosh (@jsquash/webp, WebAssembly) does it, loaded only when needed.
async function webp(canvas: HTMLCanvasElement) {
  const native = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  if (native?.type === "image/webp") return native;
  const { default: encode } = await import("@jsquash/webp/encode");
  const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
  return new Blob([await encode(pixels, { quality: QUALITY * 100 })], { type: "image/webp" });
}

// Each photo is cut, in the browser, into the copies the store keeps (lib/media.ts): the full size
// up to 2560 wide and one per width next/image asks for. Then it's uploaded, one photo at a time,
// through `upload` (a server action bound to what the photo is for).
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
        const bitmap = await createImageBitmap(file);
        const full = draw(bitmap, Math.min(bitmap.width, MEDIA_FULL_WIDTH));
        const form = new FormData();
        form.set("width", String(full.width));
        form.set("height", String(full.height));
        form.set("full", await webp(full), "full.webp");
        for (const width of MEDIA_WIDTHS) form.set(`w${width}`, await webp(draw(bitmap, width)), `${width}.webp`);
        bitmap.close();
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
      <label htmlFor={id} className={cn(quietPill, "h-9 cursor-pointer", busy && "pointer-events-none text-muted-foreground")}>
        <ImagePlus className="size-4" strokeWidth={1.8} aria-hidden />
        {busy ? "Uploading" : label}
      </label>
      {status ? (
        <p role={status.error ? "alert" : "status"} className={cn("text-sm", status.error ? "text-destructive" : "text-muted-foreground")}>
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
