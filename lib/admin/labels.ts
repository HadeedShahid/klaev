import type { CourierStatus, OrderStatus } from "./orders";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "To confirm",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refused: "Refused",
};

// Where a shipped parcel is. A shipped order's badge shows this instead of "Shipped".
export const COURIER_LABELS: Record<CourierStatus, string> = {
  booked: "Booked",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  attempted: "Delivery attempted",
  returning: "Coming back",
};

export const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
  in_person: "In person",
  cash: "Cash",
};

export const STATE_LABELS = {
  paid: "Paid",
  with_courier: "With courier",
  advance: "Advance in",
  part: "Part paid",
  unpaid: "Unpaid",
} as const;
