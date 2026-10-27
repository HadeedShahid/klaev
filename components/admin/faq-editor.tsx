"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useActionState, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { faqAction } from "@/app/actions/admin-settings";
import { Button } from "@/components/ui/button";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Item = { key: number; question: string; answer: string };

// The home page questions in their order: edit any, move them, add or take one away, then save.
export function FaqEditor({ items: initial }: { items: { question: string; answer: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(faqAction, null);
  const [items, setItems] = useState<Item[]>(() => initial.map((item, index) => ({ key: index, ...item })));
  const update = (key: number, change: Partial<Item>) => setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
  const move = (index: number, by: -1 | 1) =>
    setItems((current) => {
      const next = [...current];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="items" value={JSON.stringify(items.map(({ question, answer }) => ({ question, answer })))} />
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item.key} className="flex flex-col gap-2 rounded-xl border border-hairline p-3">
            <div className="flex items-center gap-1">
              <label htmlFor={`faq-${item.key}-question`} className="sr-only">
                Question {index + 1}
              </label>
              <input
                id={`faq-${item.key}-question`}
                value={item.question}
                onChange={(event) => update(item.key, { question: event.target.value })}
                placeholder="The question"
                className={cn(adminField, "font-medium")}
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp strokeWidth={1.8} aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown strokeWidth={1.8} aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove this question" onClick={() => setItems((current) => current.filter((other) => other.key !== item.key))}>
                <X strokeWidth={1.8} aria-hidden />
              </Button>
            </div>
            <label htmlFor={`faq-${item.key}-answer`} className="sr-only">
              Answer {index + 1}
            </label>
            <textarea
              id={`faq-${item.key}-answer`}
              value={item.answer}
              onChange={(event) => update(item.key, { answer: event.target.value })}
              rows={3}
              placeholder="The answer"
              className={cn(adminField, "h-auto resize-y py-2 leading-normal")}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, { key: Date.now(), question: "", answer: "" }])}>
          <Plus data-icon="inline-start" strokeWidth={1.8} aria-hidden />
          Add a question
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
        {state ? (
          <p role={"error" in state ? "alert" : "status"} className={cn("text-sm", "error" in state ? "text-destructive" : "text-muted-foreground")}>
            {"error" in state ? state.error : state.done}
          </p>
        ) : null}
      </div>
    </form>
  );
}
