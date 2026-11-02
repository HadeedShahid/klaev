import { cn } from "@/lib/utils";

import { Spinner } from "./spinner";

const SWAP = "transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

// What a button says while its action runs: the label crossfades into a spinner and back. Label and
// spinner sit in one grid cell, so the button keeps the label's height and width the whole time and
// nothing around it moves. Screen readers hear `busyText` ("Adding", "Saving") in place of the
// spinner. The button itself sets aria-busy, which keeps its normal look while it's disabled.
export function BusyLabel({ busy, busyText, children }: { busy: boolean; busyText: string; children: React.ReactNode }) {
  return (
    <span className="grid place-items-center gap-[inherit] *:col-start-1 *:row-start-1">
      <span aria-hidden={busy || undefined} className={cn("inline-flex items-center justify-center gap-[inherit]", SWAP, busy && "scale-95 opacity-0 blur-[2px]")}>
        {children}
      </span>
      <Spinner role="presentation" aria-label={undefined} aria-hidden className={cn("size-[1.15em]", SWAP, busy ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
      <span role="status" className="sr-only">
        {busy ? busyText : ""}
      </span>
    </span>
  );
}
