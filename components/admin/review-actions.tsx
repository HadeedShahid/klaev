"use client";

import { startTransition, useActionState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { removeReviewImage, reviewAction, uploadReviewImage } from "@/app/actions/admin-reviews";
import { ActionDialog } from "@/components/admin/action-dialog";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { BusyLabel } from "@/components/ui/busy-label";
import { Button } from "@/components/ui/button";

type Review = {
  id: number;
  name: string;
  status: "pending" | "published" | "hidden";
  featured: boolean;
  reply: string | null;
  source: "site" | "whatsapp" | "instagram";
  hasPhoto: boolean;
  hasScreenshot: boolean;
};

// One tap each: publish or hide, and put a live review on the home page or take it off. Replying
// and adding the message's screenshot open their own forms.
export function ReviewActions({ review }: { review: Review }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reviewAction, null);
  const first = review.name.split(/\s+/)[0];
  const run = (intent: string) => {
    const form = new FormData();
    form.set("id", String(review.id));
    form.set("intent", intent);
    startTransition(() => action(form));
  };
  const tap = (intent: string, label: string, variant: "default" | "outline" | "ghost" = "outline") => (
    <Button type="button" size="sm" variant={variant} disabled={pending} aria-busy={pending} onClick={() => run(intent)}>
      <BusyLabel busy={pending} busyText="Saving">
        {label}
      </BusyLabel>
    </Button>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {review.status === "published" ? (
          <>
            {review.featured ? tap("unfeature", "Take off the home page") : tap("feature", "Show on the home page")}
            {tap("hide", "Hide", "ghost")}
          </>
        ) : (
          <>
            {tap("publish", "Publish", "default")}
            {review.status === "pending" ? tap("hide", "Hide", "ghost") : tap("waiting", "Back to waiting", "ghost")}
          </>
        )}
        <ActionDialog
          action={reviewAction}
          label={review.reply ? "Edit reply" : "Reply"}
          title={`Reply to ${first}`}
          description="Shown under the review on the store, as from Klaev."
          hidden={{ id: review.id, intent: "reply" }}
          submit="Save reply"
          variant="ghost"
        >
          <textarea
            name="reply"
            aria-label="Reply"
            defaultValue={review.reply ?? ""}
            maxLength={600}
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed"
          />
        </ActionDialog>
        {review.hasScreenshot ? <RemoveImage id={review.id} which="screenshot" /> : null}
        {review.hasPhoto ? <RemoveImage id={review.id} which="photo" /> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {review.source !== "site" && !review.hasScreenshot ? (
          <PhotoUploader upload={uploadReviewImage.bind(null, review.id, "screenshot")} multiple={false} label="Add the message's screenshot" />
        ) : null}
        {!review.hasPhoto ? <PhotoUploader upload={uploadReviewImage.bind(null, review.id, "photo")} multiple={false} label="Add their photo" /> : null}
      </div>
      {state && "error" in state ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

function RemoveImage({ id, which }: { id: number; which: "photo" | "screenshot" }) {
  return (
    <ActionDialog
      action={removeReviewImage}
      label={which === "photo" ? "Remove photo" : "Remove screenshot"}
      title={which === "photo" ? "Remove their photo?" : "Remove the screenshot?"}
      description="It comes off the store too."
      hidden={{ id, which }}
      submit="Remove"
      dismiss="Keep it"
      variant="ghost"
    />
  );
}
