import type { ReactNode } from "react";

import { BreadcrumbData, Breadcrumbs } from "@/components/site/breadcrumbs";

// A page of the store's own words (About, a policy, Contact, the size chart): a reading column
// with the trail, the title and what follows.
const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "long", year: "numeric" });

export function StorePage({ path, title, lead, updated, children }: { path: string; title: string; lead?: ReactNode; updated?: Date; children: ReactNode }) {
  const trail = [
    { name: "Home", href: "/" },
    { name: title, href: path },
  ];
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-6 pb-16 md:px-8 md:pt-10">
      <BreadcrumbData trail={trail} />
      <Breadcrumbs trail={trail} placement="top" className="px-0 pt-0" />
      <header className="flex flex-col gap-3">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-balance md:text-5xl">{title}</h1>
        {lead ? <div className="text-lg text-muted-foreground text-pretty">{lead}</div> : null}
        {updated ? <p className="text-sm text-muted-foreground">Last updated {day.format(updated)}</p> : null}
      </header>
      {children}
      <Breadcrumbs trail={trail} placement="bottom" className="px-0" />
    </article>
  );
}
