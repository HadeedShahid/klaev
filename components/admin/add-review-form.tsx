"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import type { ActionState } from "@/app/actions/admin";
import { addReviewAction } from "@/app/actions/admin-reviews";
import { Field } from "@/components/admin/field";
import { BusyLabel } from "@/components/ui/busy-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Item = { lineId: number; title: string; size: string | null };

// A review that came in on WhatsApp or Instagram, typed in against the order it's about. It's live
// once added; the message's screenshot goes on it from the Reviews list.
export function AddReviewForm({ number, items, name, city }: { number: number; items: Item[]; name: string; city: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addReviewAction, null);
  const id = `add-review-${number}`;
  // Sent through a transition rather than the form's action, so a refused review keeps its words.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  return (
    <form action={action} onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="number" value={number} />
      <Card>
        <CardHeader>
          <CardTitle>Their review</CardTitle>
          <CardDescription>In their words, as they sent it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {items.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-line`} className="text-sm font-medium">
                About
              </label>
              <select id={`${id}-line`} name="lineId" className={adminField}>
                {items.map((item) => (
                  <option key={item.lineId} value={item.lineId}>
                    {item.title}
                    {item.size ? `, size ${item.size}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <input type="hidden" name="lineId" value={items[0].lineId} />
              <p className="text-sm">
                <span className="font-medium">{items[0].title}</span>
                {items[0].size ? <span className="text-muted-foreground">, size {items[0].size}</span> : null}
              </p>
            </>
          )}
          <div className="flex flex-col gap-1.5 sm:max-w-[calc(50%-0.5rem)]">
            <label htmlFor={`${id}-rating`} className="text-sm font-medium">
              Rating
            </label>
            <select id={`${id}-rating`} name="rating" defaultValue="5" className={adminField}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value === 1 ? "1 star" : `${value} stars`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-body`} className="text-sm font-medium">
              Words
            </label>
            <textarea id={`${id}-body`} name="body" rows={4} className={cn(adminField, "h-auto py-2 leading-relaxed")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-name`} name="name" label="Name shown" defaultValue={name} hint={city ? `With their city, ${city}.` : undefined} required />
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-source`} className="text-sm font-medium">
                Sent on
              </label>
              <select id={`${id}-source`} name="source" defaultValue="whatsapp" className={adminField}>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="agreed" className="mt-0.5 size-4 accent-foreground" />
            <span>They agreed to it being on the store.</span>
          </label>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          <BusyLabel busy={pending} busyText="Adding">
            Add review
          </BusyLabel>
        </Button>
        {state && "error" in state ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
