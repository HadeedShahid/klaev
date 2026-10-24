import { STORE, whatsappLink } from "@/lib/store";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-muted text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-3 md:px-8">
        <div className="flex flex-col gap-2">
          <p className="font-semibold tracking-[0.28em] text-foreground uppercase">Klaev</p>
          <p>Real leather. Made in Pakistan, delivered across Pakistan.</p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">Help</p>
          <a className="hover:text-foreground hover:underline" href={whatsappLink()}>
            WhatsApp {STORE.whatsappDisplay}
          </a>
          <a className="hover:text-foreground hover:underline" href={`mailto:${STORE.email}`}>
            {STORE.email}
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">Follow</p>
          <a className="hover:text-foreground hover:underline" href={`https://instagram.com/${STORE.instagram}`}>
            Instagram @{STORE.instagram}
          </a>
        </div>
      </div>
    </footer>
  );
}
