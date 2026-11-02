export type CartLine = { variantId: string; quantity: number };

export const CART_COOKIE = "klaev_cart";
// A readable copy of the item count, so static pages can show it in the header without a server render.
export const CART_COUNT_COOKIE = "klaev_cart_count";
export const MAX_QUANTITY = 5;

// The cookie stores short keys to stay well under the 4 KB cookie limit.
type StoredLine = { v: string; q: number };

function isStoredLine(value: unknown): value is StoredLine {
  if (typeof value !== "object" || value === null) return false;
  const { v, q } = value as Record<string, unknown>;
  return typeof v === "string" && v.length > 0 && Number.isInteger(q) && (q as number) > 0;
}

export function decodeCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isStoredLine)
    .map(({ v, q }) => ({ variantId: v, quantity: Math.min(q, MAX_QUANTITY) }));
}

export function encodeCart(lines: CartLine[]) {
  return JSON.stringify(lines.map(({ variantId, quantity }) => ({ v: variantId, q: quantity })));
}

export function addLine(lines: CartLine[], variantId: string): CartLine[] {
  const existing = lines.find((line) => line.variantId === variantId);
  if (!existing) return [...lines, { variantId, quantity: 1 }];
  return lines.map((line) =>
    line.variantId === variantId ? { ...line, quantity: Math.min(line.quantity + 1, MAX_QUANTITY) } : line,
  );
}

export type CartLimit = { reason: "stock"; left: number } | { reason: "max" };

// Why one more of a size can't go in the cart, or null when it can: the cart already holds every
// unit left, or the most one order takes.
export function addLimit(inCart: number, left: number): CartLimit | null {
  if (inCart >= left) return { reason: "stock", left };
  if (inCart >= MAX_QUANTITY) return { reason: "max" };
  return null;
}

// What the buy bar says when it stops: plain counts, no urgency.
export function limitWords(limit: CartLimit, size: string | null) {
  if (limit.reason === "max") return { title: `${MAX_QUANTITY} is the most per order`, detail: "Ask on WhatsApp for more" };
  const { left } = limit;
  return {
    title: size ? `${left} left in size ${size}` : `${left} left`,
    detail: left === 1 ? "It's in your cart" : left === 2 ? "Both are in your cart" : `All ${left} are in your cart`,
  };
}

export function removeLine(lines: CartLine[], variantId: string): CartLine[] {
  return lines.filter((line) => line.variantId !== variantId);
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

// Reads the count from a document.cookie string. Anything missing or garbled counts as an empty cart.
export function readCartCount(cookieString: string) {
  const match = cookieString.match(new RegExp(`(?:^|;\\s*)${CART_COUNT_COOKIE}=([^;]*)`));
  const count = match ? Number(match[1]) : 0;
  return Number.isInteger(count) && count > 0 ? count : 0;
}
