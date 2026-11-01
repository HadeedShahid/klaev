import { CartDrawer } from "@/components/site/cart-drawer";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { MetaPixel } from "@/components/site/meta-pixel";
import { Tracker } from "@/components/site/tracker";
import { FLAGS } from "@/lib/flags";
import { getCodTerms, getMetaSettings } from "@/lib/settings";

// Reads the cash on delivery terms and the Meta switch (Settings), not cookies or headers, so every
// page stays static.
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const meta = await getMetaSettings();
  return (
    <>
      {meta.enabled ? <MetaPixel pixelId={meta.pixelId} /> : null}
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <Tracker />
      {FLAGS.cartDrawer ? <CartDrawer terms={await getCodTerms()} /> : null}
    </>
  );
}
