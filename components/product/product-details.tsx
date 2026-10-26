import { ChevronDown } from "lucide-react";

import { Disclosure } from "@/components/ui/disclosure";
import type { ProductSection } from "@/lib/catalog";

export function ProductDetails({ intro, sections }: { intro: string[]; sections: ProductSection[] }) {
  return (
    <div className="flex flex-col gap-5">
      {intro.length ? (
        <div className="flex flex-col gap-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
          {intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      <div className="divide-y divide-hairline border-y border-hairline">
        {sections.map((section) => (
          <Disclosure
            key={section.heading}
            summaryClassName="flex min-h-14 cursor-pointer items-center justify-between gap-3 font-medium"
            summary={
              <>
                {section.heading}
                <ChevronDown className="disclosure-chevron size-4.5 shrink-0 text-muted-foreground" aria-hidden />
              </>
            }
          >
            <div className="flex flex-col gap-3 pb-5 text-[0.9375rem] leading-relaxed text-muted-foreground">
              {section.items.length ? (
                <ul className="flex flex-col gap-2">
                  {section.items.map((item) => (
                    <li key={item.text}>
                      {item.title ? <span className="font-medium text-foreground">{item.title}. </span> : null}
                      {item.text}
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Disclosure>
        ))}
      </div>
    </div>
  );
}
