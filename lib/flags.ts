// Feature flags, fixed when the site is built: NEXT_PUBLIC_ values are written into the browser
// bundle, so changing one takes a new build and deploy.
export const FLAGS = {
  // The cart opens as a drawer over the page, from the cart icon and after Add to cart. Set
  // NEXT_PUBLIC_CART_DRAWER=off and both go to the cart page instead. The page stays either way:
  // it is where links land and what the cart icon opens before JavaScript loads.
  cartDrawer: process.env.NEXT_PUBLIC_CART_DRAWER !== "off",
};
