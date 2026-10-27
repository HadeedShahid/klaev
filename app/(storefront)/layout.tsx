import { CartDrawer } from "@/components/site/cart-drawer";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { FLAGS } from "@/lib/flags";
import { getCodTerms } from "@/lib/settings";

// Reads the cash on delivery terms (Settings), not cookies or headers, so every page stays static.
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {FLAGS.cartDrawer ? <CartDrawer terms={await getCodTerms()} /> : null}
    </>
  );
}
