import type { Metadata } from "next";
import { OrdersList } from "@/components/orders-list";

export const metadata: Metadata = { title: "我的订单" };

export default function AccountOrdersPage() {
  return <OrdersList />;
}
