import type { Metadata } from "next";

import { ContactForm } from "@/components/site/contact-form";
import { StorePage } from "@/components/site/store-page";
import { STORE, whatsappLink } from "@/lib/store";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about an order, a size or a custom jacket. WhatsApp, email, or the form.",
  alternates: { canonical: "/pages/contact" },
};

// Shopify's contact form, with WhatsApp first: most customers reach the store there.
export default function ContactPage() {
  const whatsapp = whatsappLink("Hi Klaev, ");
  return (
    <StorePage
      path="/pages/contact"
      title="Contact"
      lead={
        <>
          Questions about an order, a size, or a custom jacket. Quickest on{" "}
          <a href={whatsapp} className="text-foreground underline underline-offset-[0.2em] hover:no-underline">
            WhatsApp {STORE.whatsappDisplay}
          </a>
          , or email{" "}
          <a href={`mailto:${STORE.email}`} className="text-foreground underline underline-offset-[0.2em] hover:no-underline">
            {STORE.email}
          </a>
          . Or write to us here.
        </>
      }
    >
      <ContactForm whatsappHref={whatsapp} />
    </StorePage>
  );
}
