import Link from "next/link";

import { STORE, whatsappLink } from "@/lib/store";

const link = "hover:text-foreground hover:underline";

export function SiteFooter() {
  return (
    <footer data-site-footer className="border-t border-hairline bg-muted text-sm text-muted-foreground">
      {/* Two columns on a phone (the brand line across both), four from tablets. */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 md:grid-cols-4 md:px-8">
        <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
          <p className="text-[1.0625rem] font-semibold tracking-[0.28em] text-foreground uppercase">Klaev</p>
          <p>Real leather. Made in Pakistan, delivered across Pakistan.</p>
          <Link className={link} href="/pages/about">
            About Klaev
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">Help</p>
          <Link className={link} href="/track">
            Track your order
          </Link>
          <Link className={link} href="/pages/jackets-size-chart">
            Size chart
          </Link>
          <Link className={link} href="/pages/contact">
            Contact
          </Link>
          <a className={link} href={whatsappLink()}>
            WhatsApp {STORE.whatsappDisplay}
          </a>
          <a className={link} href={`mailto:${STORE.email}`}>
            {STORE.email}
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">Policies</p>
          <Link className={link} href="/policies/shipping-policy">
            Delivery
          </Link>
          <Link className={link} href="/policies/refund-policy">
            Exchanges and refunds
          </Link>
          <Link className={link} href="/policies/privacy-policy">
            Privacy
          </Link>
          <Link className={link} href="/policies/terms-of-service">
            Terms
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-foreground">More</p>
          <Link className={link} href="/blogs/blog">
            Journal
          </Link>
          <a className={link} href={`https://instagram.com/${STORE.instagram}`}>
            Instagram @{STORE.instagram}
          </a>
        </div>
      </div>
    </footer>
  );
}
