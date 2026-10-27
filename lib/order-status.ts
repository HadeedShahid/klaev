import type { COURIER_STATUSES, ORDER_STATUSES } from "./db/schema";
import { STORE } from "./store";

type Status = (typeof ORDER_STATUSES)[number];
type CourierStatus = (typeof COURIER_STATUSES)[number];

// Where an order is, in a sentence for the customer. The courier is never named.
export function statusLine(order: { status: Status; courierStatus: CourierStatus | null; city: string | null }) {
  switch (order.status) {
    case "pending":
      return "Placed. We confirm it on WhatsApp once the payment is in.";
    case "confirmed":
      return "Confirmed. We're getting it ready to send.";
    case "packed":
      return "Confirmed and packed. It goes out with the next pickup.";
    case "shipped":
      switch (order.courierStatus) {
        case "in_transit":
          return order.city ? `On its way to ${order.city}.` : "On its way to you.";
        case "out_for_delivery":
          return "Out for delivery today. Keep your phone close; the rider may call.";
        case "attempted":
          return "The rider couldn't deliver it. We'll message you on WhatsApp to arrange another try.";
        case "returning":
          return "It's on its way back to us. Message us on WhatsApp if you still want it.";
        default:
          return `Handed to the courier. Most orders arrive in ${STORE.deliveryDays} days.`;
      }
    case "delivered":
      return "Delivered. Thank you for buying from Klaev.";
    case "cancelled":
      return "This order was cancelled.";
    case "refused":
      return "This order came back to us undelivered.";
  }
}

// The steps an order goes through, each with when it happened. Cancelled and refused orders stop
// where they were.
export function orderSteps(order: {
  createdAt: Date;
  confirmedAt: Date | null;
  packedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}) {
  return [
    { label: "Placed", at: order.createdAt },
    { label: "Confirmed", at: order.confirmedAt },
    { label: "Packed", at: order.packedAt },
    { label: "Shipped", at: order.shippedAt },
    { label: "Delivered", at: order.deliveredAt },
  ];
}
