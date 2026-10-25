import { formatPKR } from "./money";

type Line = { title: string; size: string | null; quantity: number; lineTotal: number };

// The WhatsApp message for a shopper who would rather order there than through checkout.
export function orderMessage(lines: Line[], subtotal: number) {
  const items = lines.map((line) => {
    const size = line.size ? `, size ${line.size}` : "";
    const quantity = line.quantity > 1 ? `, quantity ${line.quantity}` : "";
    return `- ${line.title}${size}${quantity} (${formatPKR(line.lineTotal)})`;
  });
  return ["Hi Klaev, I'd like to order:", ...items, `Subtotal: ${formatPKR(subtotal)}`].join("\n");
}
