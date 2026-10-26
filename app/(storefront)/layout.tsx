import { CartDrawer } from "@/components/site/cart-drawer";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { FLAGS } from "@/lib/flags";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {FLAGS.cartDrawer ? <CartDrawer /> : null}
    </>
  );
}
