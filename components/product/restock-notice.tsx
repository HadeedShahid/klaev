import { STORE, instagramProfileLink } from "@/lib/store";

// "Restocking soon": the storefront's one dark panel. The owner wanted it to stand out from the
// white page (5 November 2026), and it does so in the store's own Ink, a soft charcoal-to-black
// sheen with Paper words, rather than a new colour. Selection and focus turn light inside it, so
// neither disappears into the black. The pill below stays the action.
export function RestockNotice({ soldOut, sized }: { soldOut: boolean; sized: boolean }) {
  return (
    <div
      data-testid="restock-notice"
      className="flex flex-col gap-2 rounded-xl bg-[linear-gradient(135deg,oklch(0.3_0.005_286),oklch(0.17_0.004_286))] px-5 py-5 text-[0.9375rem] text-primary-foreground selection:bg-primary-foreground selection:text-primary"
    >
      <p className="leading-snug font-semibold">{soldOut ? "Sold out. Restocking soon." : "More sizes restocking soon."}</p>
      <p className="leading-[1.7] text-pretty text-[oklch(0.85_0.005_286)]">
        Message{" "}
        <a
          href={instagramProfileLink}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary-foreground underline decoration-current/45 underline-offset-[0.2em] hover:decoration-current focus-visible:outline-primary-foreground"
        >
          @{STORE.instagram}
        </a>{" "}
        on Instagram{sized ? " with your size" : ""}, and we&apos;ll hold one for you from the new batch.
      </p>
    </div>
  );
}
