"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, mediaUrl } from "@/lib/api";

type Order = {
  id: number;
  number: string;
  product_name: string;
  product_image_url: string | null;
  variant_name: string;
  quantity: number;
  reference_total: number;
  status: string;
  status_label: string;
  created_at: string;
};

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    apiRequest<Order[]>("/orders")
      .then((payload) => { setOrders(payload); setState("ready"); })
      .catch(() => setState("error"));
  }, []);

  async function cancelOrder(order: Order) {
    try {
      await apiRequest(`/orders/${order.id}/cancel`, { method: "POST" });
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: "CANCELED", status_label: "已取消" } : item));
    } catch {
      setState("error");
    }
  }

  return (
    <main className="account-page shell">
      <div className="page-heading">
        <p className="eyebrow">CUSTOMER / ORDER ARCHIVE</p>
        <h1>我的订单</h1>
      </div>
      {state === "loading" && <p className="state-box">正在读取订单档案…</p>}
      {state === "error" && (
        <div className="state-box"><p>请先登录，或确认本地 API 已经启动。</p><Link className="button button-secondary" href="/login?next=/account/orders">前往登录</Link></div>
      )}
      {state === "ready" && orders.length === 0 && <p className="state-box">还没有订单，先去浏览商品档案吧。</p>}
      <div className="order-list">
        {orders.map((order) => (
          <article key={order.id} className="order-card">
            {order.product_image_url && <Image className="order-product-image" src={mediaUrl(order.product_image_url) ?? ""} alt={`${order.product_name}订单商品图`} width={96} height={120} unoptimized />}
            <div><span className="mono-note">{order.number}</span><h2>{order.product_name}</h2><p>{order.variant_name} × {order.quantity}</p></div>
            <div><span className={`status status-${order.status.toLowerCase()}`}>{order.status_label}</span><strong>参考金额 ¥{order.reference_total}</strong><time>{new Date(order.created_at).toLocaleString("zh-CN")}</time>{order.status === "PENDING_CONFIRMATION" && <button className="table-button" onClick={() => void cancelOrder(order)}>取消订单</button>}{order.status === "CONFIRMED" && <small>如需取消，请联系管理员。</small>}</div>
          </article>
        ))}
      </div>
    </main>
  );
}
