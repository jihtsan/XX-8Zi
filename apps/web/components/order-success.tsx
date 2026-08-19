"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { OrderDetail } from "@/lib/orders";
import { MerchantContactPanel } from "./merchant-contact";

export function OrderSuccess() {
  const orderId = Number(useSearchParams().get("order"));
  const invalidOrderId = !Number.isInteger(orderId) || orderId <= 0;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invalidOrderId) return;
    apiRequest<OrderDetail>(`/orders/${orderId}`)
      .then(setOrder)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "订单读取失败"),
      );
  }, [invalidOrderId, orderId]);

  const visibleError = invalidOrderId
    ? "订单链接无效，请从我的订单进入。"
    : error;

  if (visibleError) {
    return (
      <main className="success-page shell">
        <section className="success-card">
          <p className="eyebrow">ORDER / NOT VERIFIED</p>
          <h1>无法确认订单</h1>
          <p>{visibleError}</p>
          <div className="success-actions">
            <Link className="button button-primary" href="/account/orders">
              查看我的订单
            </Link>
            <Link className="button button-secondary" href="/">
              返回商城
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="success-page shell">
        <p className="state-box">正在确认订单与商家联系方式…</p>
      </main>
    );
  }

  return (
    <main className="success-page shell">
      <section className="success-card">
        <p className="eyebrow">ORDER CREATED / PENDING CONFIRMATION</p>
        <span className="success-symbol">◇</span>
        <h1>订单已提交</h1>
        <p>请添加商家微信并发送订单编号，双方将在线下确认最终价格与交付方式。</p>
        <div className="order-number">
          <small>订单编号 · {order.status_label}</small>
          <strong>{order.number}</strong>
        </div>
        <MerchantContactPanel contact={order.merchant_contact} />
        <div className="success-actions">
          <Link className="button button-primary" href={`/account/orders/${order.id}`}>
            查看订单
          </Link>
          <Link className="button button-secondary" href="/">继续浏览</Link>
        </div>
      </section>
    </main>
  );
}
