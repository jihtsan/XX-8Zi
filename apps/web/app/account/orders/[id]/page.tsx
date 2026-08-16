import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/order-detail";

export const metadata: Metadata = { title: "订单详情" };

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <OrderDetail orderId={Number(id)} />;
}
