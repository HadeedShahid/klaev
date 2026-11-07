"use client";

import { CircleCheck, ImagePlus, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { sendReview, sendReviewPhoto } from "@/app/actions/reviews";
import { Star } from "@/components/product/stars";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BusyLabel } from "@/components/ui/busy-label";
import { photoCopies } from "@/lib/photo-copies";
import { BODY_MAX } from "@/lib/review-rules";
import { pill, quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

const control = "w-full rounded-xl border border-input bg-background px-4 text-base transition-colors placeholder:text-muted-foreground";
type Field = "rating" | "body" | "name";

// One review: stars, a few words, a photo if they like, and the name to show. The words and photo are
// optional. The photo goes up after the review, cut into the store's sizes here.
export function ReviewForm({ token, lineId, name, city }: { token: string; lineId: number; name: string; city: string | null }) {
  const id = useId();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  // The chosen photo and a local address to preview it at, let go of when it changes.
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ field?: Field; message: string } | null>(null);
  const [done, setDone] = useState<{ photoFailed: boolean } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const thanks = useRef<HTMLDivElement>(null);
  const status = useRef<HTMLParagraphElement>(null);

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  useEffect(() => {
    if (done) thanks.current?.focus();
  }, [done]);

  useEffect(() => {
    if (!error) return;
    const invalid = form.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid]");
    (invalid ?? status.current)?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setBusy("Sending");
    const result = await sendReview(token, lineId, data).catch(() => ({ ok: false as const, message: "That didn't go through. Try again." }));
    if (!result.ok) {
      setError(result);
      setBusy(null);
      return;
    }
    let photoFailed = false;
    if (photo) {
      setBusy("Adding your photo");
      try {
        photoFailed = !(await sendReviewPhoto(token, result.id, await photoCopies(photo.file))).ok;
      } catch {
        photoFailed = true;
      }
    }
    setBusy(null);
    setDone({ photoFailed });
  }

  if (done) {
    return (
      <div ref={thanks} tabIndex={-1} role="status" className="scroll-mt-24 outline-none">
        <Alert className="text-base">
          <CircleCheck className="text-tone-green" strokeWidth={2} aria-hidden />
          <AlertTitle>Thank you.</AlertTitle>
          <AlertDescription>
            {done.photoFailed
              ? "Your review is in. The photo didn't come through, so send it to us on WhatsApp."
              : "It shows on the store once we've read it."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const invalid = (field: Field) => (error?.field === field ? true : undefined);
  const describedBy = (field: Field) => (error?.field === field ? `${id}-${field}-error` : undefined);
  const errorFor = (field: Field) =>
    error?.field === field ? (
      <p id={`${id}-${field}-error`} className="text-sm text-destructive">
        {error.message}
      </p>
    ) : null;
  const shown = hover || rating;

  return (
    <form ref={form} onSubmit={submit} className="flex flex-col gap-7" noValidate>
      <fieldset className="flex flex-col gap-2" aria-describedby={describedBy("rating")}>
        <legend className="mb-1 text-[0.9375rem] font-medium">Your rating</legend>
        <div className="-ml-2 flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              onMouseEnter={() => setHover(value)}
              className="relative flex size-12 cursor-pointer items-center justify-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                data-invalid={value === 1 && error?.field === "rating" ? "" : undefined}
                className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
              />
              <span className="sr-only">{value === 1 ? "1 star" : `${value} stars`}</span>
              <Star filled={value <= shown} className="size-8 transition-colors" />
            </label>
          ))}
        </div>
        {errorFor("rating")}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-body`} className="text-[0.9375rem] font-medium">
          Your review <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id={`${id}-body`}
          name="body"
          rows={4}
          maxLength={BODY_MAX}
          aria-invalid={invalid("body")}
          aria-describedby={describedBy("body")}
          className={cn(control, "min-h-28 py-3 leading-relaxed")}
        />
        {errorFor("body")}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[0.9375rem] font-medium">
          A photo of you wearing it <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        {photo ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
            <img src={photo.url} alt="" className="size-16 rounded-lg bg-muted object-cover" />
            <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{photo.file.name}</p>
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label="Remove the photo"
              className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent"
            >
              <X className="size-5" strokeWidth={1.8} aria-hidden />
            </button>
          </div>
        ) : (
          <label className={cn(quietPill, "h-11 cursor-pointer self-start has-focus-visible:outline-2 has-focus-visible:outline-ring")}>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) setPhoto({ file, url: URL.createObjectURL(file) });
              }}
            />
            <ImagePlus className="size-4" strokeWidth={1.8} aria-hidden />
            Add a photo
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-name`} className="text-[0.9375rem] font-medium">
          Name shown
        </label>
        <input
          id={`${id}-name`}
          name="name"
          defaultValue={name}
          autoComplete="off"
          maxLength={40}
          aria-invalid={invalid("name")}
          aria-describedby={[describedBy("name"), city ? `${id}-city` : null].filter(Boolean).join(" ") || undefined}
          className={cn(control, "h-12")}
        />
        {city ? (
          <p id={`${id}-city`} className="text-sm text-muted-foreground">
            With your city, {city}.
          </p>
        ) : null}
        {errorFor("name")}
      </div>

      <div className="flex flex-col gap-3">
        {error && !error.field ? (
          <p ref={status} tabIndex={-1} role="alert" className="text-sm text-destructive outline-none">
            {error.message}
          </p>
        ) : null}
        <button type="submit" disabled={busy !== null} aria-busy={busy !== null} className={cn(pill, "w-full")}>
          <BusyLabel busy={busy !== null} busyText={busy ?? "Sending"}>
            Send review
          </BusyLabel>
        </button>
      </div>
    </form>
  );
}
