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
