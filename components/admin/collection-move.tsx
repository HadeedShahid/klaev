"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { startTransition, useActionState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { collectionAction } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";

// Moves a collection one place up or down the store's order.
export function CollectionMove({ handle, first, last }: { handle: string; first: boolean; last: boolean }) {
  const [, action, pending] = useActionState<ActionState, FormData>(collectionAction, null);
  const move = (intent: "up" | "down") => {
    const form = new FormData();
    form.set("handle", handle);
    form.set("intent", intent);
    startTransition(() => action(form));
  };
  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={first || pending} onClick={() => move("up")}>
        <ArrowUp strokeWidth={1.8} aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={last || pending} onClick={() => move("down")}>
        <ArrowDown strokeWidth={1.8} aria-hidden />
      </Button>
    </>
  );
}
