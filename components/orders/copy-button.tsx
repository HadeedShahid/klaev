"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

// Copies the account number for the banking app; the tick and the spoken status confirm it in place.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked: the number stays on screen to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent"
    >
      {copied ? <Check className="size-4.5" strokeWidth={1.6} aria-hidden /> : <Copy className="size-4.5" strokeWidth={1.6} aria-hidden />}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
