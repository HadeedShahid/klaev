import Link from "next/link";

import { pill } from "@/lib/styles";

export function NotFoundContent() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-5 py-24 md:px-8">
      <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">This page isn&apos;t here</h1>
      <p className="text-muted-foreground">The link may be old, or the piece may have sold through.</p>
      <Link
        href="/"
        className={pill}
      >
        See all products
      </Link>
    </div>
  );
}
