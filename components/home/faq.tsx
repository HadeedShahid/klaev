import { ChevronDown } from "lucide-react";

import { Disclosure } from "@/components/ui/disclosure";

export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <section aria-labelledby="faq-title" className="mx-auto flex max-w-3xl flex-col gap-5 px-5 py-16 md:px-8 md:py-24">
      <h2 id="faq-title" className="text-[1.75rem] leading-tight font-semibold tracking-tight md:text-4xl">
        Questions
      </h2>
      <div className="divide-y divide-hairline border-y border-hairline">
        {items.map((item) => (
          <Disclosure
            key={item.question}
            summaryClassName="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 font-medium"
            summary={
              <>
                {item.question}
                <ChevronDown className="disclosure-chevron size-4.5 shrink-0 text-muted-foreground" aria-hidden />
              </>
            }
          >
            <p className="max-w-[52ch] pb-5 text-[0.9375rem] leading-relaxed text-muted-foreground">{item.answer}</p>
          </Disclosure>
        ))}
      </div>
    </section>
  );
}
