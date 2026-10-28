"use client";

import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent } from "react";

import { contactAction, type ContactState } from "@/app/actions/contact";
import { pill } from "@/lib/styles";
import { cn } from "@/lib/utils";

const control = "w-full rounded-xl border border-input bg-background px-4 text-base transition-colors placeholder:text-muted-foreground";

const SUBJECTS = [
  { value: "general", label: "A question" },
  { value: "order", label: "An order" },
  { value: "custom", label: "A custom jacket" },
  { value: "exchange", label: "An exchange" },
];

// Name, a way to reply, what it's about, and the message.
export function ContactForm({ whatsappHref }: { whatsappHref: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, null);
  const id = useId();
  const status = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // After a send, the thanks takes focus; after a refusal, the field to fix (or the line above the
  // button, when no field is to blame).
  useEffect(() => {
    if (!state) return;
    const invalidField = form.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    (invalidField ?? status.current)?.focus();
  }, [state]);
  // Sent through a transition rather than the form's action, so a refused message keeps its words.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  if (state && "sent" in state) {
    return (
      // scroll-mt keeps the panel clear of the sticky header when focus brings it into view.
      <div ref={status} tabIndex={-1} role="status" className="flex scroll-mt-24 flex-col gap-2 rounded-2xl bg-muted p-6 outline-none">
        <p className="text-lg font-medium">Thanks{state.sent ? `, ${state.sent}` : ""}. Your message is with us.</p>
        <p className="text-muted-foreground">
          We reply on WhatsApp or by email. For something about an order in progress,{" "}
          <a href={whatsappHref} className="text-foreground underline underline-offset-[0.2em] hover:no-underline">
            WhatsApp
          </a>{" "}
          is quickest.
        </p>
      </div>
    );
  }

  const error = state && "error" in state ? state : null;
  const invalid = (field: "name" | "contact" | "body") => (error?.field === field ? true : undefined);
  // Red belongs to the line under the field that needs fixing, as at checkout.
  const errorFor = (field: "name" | "contact" | "body") =>
    error?.field === field ? (
      <p id={`${id}-${field}-error`} className="text-sm text-destructive">
        {error.error}
      </p>
    ) : null;
  const describedBy = (field: "name" | "contact" | "body") => (error?.field === field ? `${id}-${field}-error` : undefined);
  return (
    <form ref={form} action={action} onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {/* For bots only: people never see it, so anything in it means the message isn't from a person. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-name`} className="text-[0.9375rem] font-medium">
          Name
        </label>
        <input id={`${id}-name`} name="name" autoComplete="name" aria-invalid={invalid("name")} aria-describedby={describedBy("name")} className={cn(control, "h-12")} />
        {errorFor("name")}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-phone`} className="text-[0.9375rem] font-medium">
            Mobile number
          </label>
          <input
            id={`${id}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={invalid("contact")}
            aria-describedby={describedBy("contact")}
            className={cn(control, "h-12")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-email`} className="text-[0.9375rem] font-medium">
            Email
          </label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={invalid("contact")}
            aria-describedby={describedBy("contact")}
            className={cn(control, "h-12")}
          />
        </div>
      </div>
      <div className="-mt-3 flex flex-col gap-1.5">
        {errorFor("contact")}
        <p className="text-sm text-muted-foreground">One is enough. We reply on WhatsApp or by email.</p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[0.9375rem] font-medium">It&apos;s about</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject, index) => (
            <label
              key={subject.value}
              className="flex h-11 cursor-pointer items-center rounded-full border border-border px-4 text-sm has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input type="radio" name="subject" value={subject.value} defaultChecked={index === 0} className="sr-only" />
              {subject.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-message`} className="text-[0.9375rem] font-medium">
          Message
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={5}
          aria-invalid={invalid("body")}
          aria-describedby={describedBy("body")}
          className={cn(control, "min-h-32 resize-y py-3 leading-normal")}
        />
        {errorFor("body")}
      </div>
      <div ref={status} tabIndex={-1} className="outline-none">
        {error && !error.field ? (
          <p role="alert" className="text-sm text-destructive">
            {error.error}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending} className={cn(pill, "w-full sm:w-auto sm:self-start disabled:bg-muted disabled:text-muted-foreground")}>
        {pending ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
