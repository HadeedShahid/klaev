import Link from "next/link";

import { inlineParts, parseBody } from "@/lib/journal-body";
import { cn } from "@/lib/utils";

function Inline({ text }: { text: string }) {
  return inlineParts(text).map((part, index) =>
    part.href ? (
      part.href.startsWith("/") ? (
        <Link key={index} href={part.href} className="underline underline-offset-[0.2em] hover:no-underline">
          {part.text}
        </Link>
      ) : (
        <a key={index} href={part.href} className="underline underline-offset-[0.2em] hover:no-underline" {...(part.href.startsWith("https://") ? { target: "_blank", rel: "noreferrer" } : {})}>
          {part.text}
        </a>
      )
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

// A journal article's or a page's body as written in the admin: paragraphs, headings, lists and
// links, all as text, never as HTML.
export function RichText({ body, className }: { body: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 text-[1.0625rem] leading-relaxed", className)}>
      {parseBody(body).map((block, index) =>
        block.kind === "heading" ? (
          <h2 key={index} className="pt-3 text-2xl font-semibold tracking-tight text-balance">
            {block.text}
          </h2>
        ) : block.kind === "list" ? (
          <ul key={index} className="flex list-disc flex-col gap-2 pl-5 marker:text-muted-foreground">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={index} className="text-pretty">
            <Inline text={block.text} />
          </p>
        ),
      )}
    </div>
  );
}
