"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductSection } from "@/lib/db/schema";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Draft = { heading: string; points: string; paragraphs: string };

// Points are written one per line as "Title: text", or just text.
const toDraft = (section: ProductSection): Draft => ({
  heading: section.heading,
  points: section.items.map((item) => (item.title ? `${item.title}: ${item.text}` : item.text)).join("\n"),
  paragraphs: section.paragraphs.join("\n\n"),
});

const toSection = (draft: Draft): ProductSection => ({
  heading: draft.heading,
  items: draft.points
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return colon > 0 && colon < 60 ? { title: line.slice(0, colon).trim(), text: line.slice(colon + 1).trim() } : { title: null, text: line };
    }),
  paragraphs: draft.paragraphs.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
});

// The product page's sections (Key features, Materials and finish, Care...), each a heading with
// points, paragraphs or both. Saved with the rest of the product form.
export function SectionsEditor({ form, sections }: { form: string; sections: ProductSection[] }) {
  const [drafts, setDrafts] = useState<Draft[]>(() => sections.map(toDraft));
  const id = useId();
  const update = (index: number, change: Partial<Draft>) => setDrafts(drafts.map((draft, at) => (at === index ? { ...draft, ...change } : draft)));
  const move = (index: number, by: number) => {
    const next = [...drafts];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    setDrafts(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" form={form} name="sections" value={JSON.stringify(drafts.map(toSection))} />
      {drafts.map((draft, index) => (
        <fieldset key={index} className="flex flex-col gap-3 rounded-xl border border-hairline p-3">
          <legend className="sr-only">Section {index + 1}</legend>
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor={`${id}-${index}-heading`} className="text-sm font-medium">
                Heading
              </label>
              <input id={`${id}-${index}-heading`} value={draft.heading} onChange={(event) => update(index, { heading: event.target.value })} className={adminField} />
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Move section ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>
              <ArrowUp strokeWidth={1.8} aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`Move section ${index + 1} down`} disabled={index === drafts.length - 1} onClick={() => move(index, 1)}>
              <ArrowDown strokeWidth={1.8} aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove section ${index + 1}`} onClick={() => setDrafts(drafts.filter((_, at) => at !== index))}>
              <Trash2 strokeWidth={1.8} aria-hidden />
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-${index}-points`} className="text-sm font-medium">
              Points
            </label>
            <textarea
              id={`${id}-${index}-points`}
              rows={4}
              value={draft.points}
              onChange={(event) => update(index, { points: event.target.value })}
              placeholder={"One per line. Full-grain sheepskin: Soft and supple."}
              className={cn(adminField, "h-auto resize-y py-2 leading-normal")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-${index}-paragraphs`} className="text-sm font-medium">
              Paragraphs
            </label>
            <textarea
              id={`${id}-${index}-paragraphs`}
              rows={3}
              value={draft.paragraphs}
              onChange={(event) => update(index, { paragraphs: event.target.value })}
              placeholder="A blank line between paragraphs."
              className={cn(adminField, "h-auto resize-y py-2 leading-normal")}
            />
          </div>
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setDrafts([...drafts, { heading: "", points: "", paragraphs: "" }])}>
        <Plus data-icon="inline-start" strokeWidth={1.8} aria-hidden />
        Add a section
      </Button>
    </div>
  );
}
