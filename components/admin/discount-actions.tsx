"use client";

import { MoreHorizontal } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { discountAction } from "@/app/actions/admin-discounts";
import { ActionDialog } from "@/components/admin/action-dialog";
import { DiscountFields, type DiscountValues } from "@/components/admin/discount-fields";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// A code's actions in one menu: change it, turn it on or off at once, or remove it while no order
// has used it.
export function DiscountActions({ id, active, used, values }: { id: number; active: boolean; used: boolean; values: DiscountValues }) {
  const [dialog, setDialog] = useState<"edit" | "remove" | null>(null);
  const [, action, pending] = useActionState<ActionState, FormData>(discountAction, null);
  const flip = () => {
    const form = new FormData();
    form.set("id", String(id));
    form.set("intent", active ? "off" : "on");
    startTransition(() => action(form));
  };
  const close = (open: boolean) => !open && setDialog(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${values.code}`} disabled={pending} />}>
          <MoreHorizontal strokeWidth={1.8} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={() => setDialog("edit")}>Edit…</DropdownMenuItem>
          <DropdownMenuItem onClick={flip}>{active ? "Turn off" : "Turn on"}</DropdownMenuItem>
          {used ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDialog("remove")}>Remove…</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionDialog
        action={discountAction}
        label="Edit"
        title={`Edit ${values.code}`}
        hidden={{ intent: "edit", id }}
        submit="Save"
        open={dialog === "edit"}
        onOpenChange={close}
      >
        <DiscountFields id={`discount-${id}`} values={values} />
      </ActionDialog>
      <ActionDialog
        action={discountAction}
        label="Remove"
        title={`Remove ${values.code}?`}
        description="No order has used it, so nothing else changes."
        hidden={{ intent: "delete", id }}
        submit="Remove it"
        dismiss="Keep it"
        open={dialog === "remove"}
        onOpenChange={close}
      />
    </>
  );
}
