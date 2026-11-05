// Store-wide terms. Each becomes an admin setting once the database exists.
export const STORE = {
  // The real domain, for links search engines and messages carry. The preview runs on workers.dev.
  siteUrl: "https://klaev.com",
  codDeliveryFee: 900,
  codAdvance: 2000,
  exchangeDays: 7,
  deliveryDays: "2 to 5",
  whatsappNumber: "923231483650",
  whatsappDisplay: "+92 323 1483650",
  instagram: "getklaev",
  email: "business.klaev@gmail.com",
  // The office, as the policies and search engines give it.
  address: { street: "Office 2, First Floor, Ahad Plaza, 14L Gulberg 3", city: "Lahore", postalCode: "54660", country: "Pakistan" },
} as const;

// Opens a chat with the store on Instagram, in the app on a phone. Instagram can't pre-write a message.
export const instagramChatLink = `https://ig.me/m/${STORE.instagram}`;
export const instagramProfileLink = `https://instagram.com/${STORE.instagram}`;

export function whatsappLink(message?: string) {
  const url = new URL(`https://wa.me/${STORE.whatsappNumber}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}
