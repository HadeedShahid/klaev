"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { collectionAction } from "@/app/actions/admin-products";
import { BusyLabel } from "@/components/ui/busy-label";
import { Button } from "@/components/ui/button";

// Moves a collection one place up or down the store's order.
export function CollectionMove({ handle, first, last }: { handle: string; first: boolean; last: boolean }) {
  const [, action, pending] = useActionState<ActionState, FormData>(collectionAction, null);
  const [moving, setMoving] = useState<"up" | "down" | null>(null);
  const move = (intent: "up" | "down") => {
    setMoving(intent);
    const form = new FormData();
    form.set("handle", handle);
    form.set("intent", intent);
    startTransition(() => action(form));
  };
  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={first || pending} aria-busy={pending && moving === "up"} onClick={() => move("up")}>
        <BusyLabel busy={pending && moving === "up"} busyText="Moving">
          <ArrowUp strokeWidth={1.8} aria-hidden />
        </BusyLabel>
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={last || pending} aria-busy={pending && moving === "down"} onClick={() => move("down")}>
        <BusyLabel busy={pending && moving === "down"} busyText="Moving">
          <ArrowDown strokeWidth={1.8} aria-hidden />
        </BusyLabel>
      </Button>
    </>
  );
}
