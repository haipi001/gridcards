import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import OrdersBoard from "@/components/OrdersBoard";

export const metadata: Metadata = pageMeta({
  title: "Orders — GRIDCARDS",
  description:
    "Listings, orders and offers for your copies — the Listing → Order → Ownership state machine.",
  path: "/orders/",
});

export default function OrdersPage() {
  return <OrdersBoard />;
}
