import { redirect } from "next/navigation";

// The Stock page became Inventory.
export default function StockPage() {
  redirect("/admin/inventory");
}
