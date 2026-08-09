import type { Metadata } from "next";
import { OrderConfirm } from "@/components/order-confirm";

export const metadata: Metadata = { title: "确认订单" };

export default function OrderConfirmPage() {
  return <OrderConfirm />;
}
