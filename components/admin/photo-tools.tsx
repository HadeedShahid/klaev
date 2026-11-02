"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { photoAction } from "@/app/actions/admin-products";
import { BusyLabel } from "@/components/ui/busy-label";
import { Button } from "@/components/ui/button";

// Moves a photo one place earlier or later. The first photo is the one the store leads with.
export function PhotoMove({ imageId, first, last }: { imageId: number; first: boolean; last: boolean }) {
  const [, action, pending] = useActionState<ActionState, FormData>(photoAction, null);
  const [moving, setMoving] = useState<"earlier" | "later" | null>(null);
  const move = (intent: "earlier" | "later") => {
    setMoving(intent);
    const form = new FormData();
    form.set("imageId", String(imageId));
    form.set("intent", intent);
    startTransition(() => action(form));
  };
  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move earlier" disabled={first || pending} aria-busy={pending && moving === "earlier"} onClick={() => move("earlier")}>
        <BusyLabel busy={pending && moving === "earlier"} busyText="Moving">
          <ArrowLeft strokeWidth={1.8} aria-hidden />
        </BusyLabel>
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move later" disabled={last || pending} aria-busy={pending && moving === "later"} onClick={() => move("later")}>
        <BusyLabel busy={pending && moving === "later"} busyText="Moving">
          <ArrowRight strokeWidth={1.8} aria-hidden />
        </BusyLabel>
      </Button>
    </>
  );
}
