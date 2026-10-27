"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { startTransition, useActionState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { photoAction } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";

// Moves a photo one place earlier or later. The first photo is the one the store leads with.
export function PhotoMove({ imageId, first, last }: { imageId: number; first: boolean; last: boolean }) {
  const [, action, pending] = useActionState<ActionState, FormData>(photoAction, null);
  const move = (intent: "earlier" | "later") => {
    const form = new FormData();
    form.set("imageId", String(imageId));
    form.set("intent", intent);
    startTransition(() => action(form));
  };
  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move earlier" disabled={first || pending} onClick={() => move("earlier")}>
        <ArrowLeft strokeWidth={1.8} aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move later" disabled={last || pending} onClick={() => move("later")}>
        <ArrowRight strokeWidth={1.8} aria-hidden />
      </Button>
    </>
  );
}
