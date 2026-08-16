"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, mediaUrl } from "@/lib/api";
import type { OrderDetail as OrderDetailPayload } from "@/lib/orders";
import { MerchantContactPanel } from "./merchant-contact";

export function OrderDetail({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<OrderDetailPayload | null>(null);
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    apiRequest<OrderDetailPayload>(`/orders/${orderId}`)
      .then(setOrder)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "订单读取失败"),
      );
  }, [orderId]);

  async function cancelOrder() {
    if (!order) return;
    setCanceling(true);
    setError("");
    try {
      await apiRequest(`/orders/${order.id}/cancel`, { method: "POST" });
      setOrder({ ...order, status: "CANCELED", status_label: "已取消" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "订单取消失败");
    } finally {
      setCanceling(false);
    }
  }

  if (error && !order) {
    return (
      <main className="account-page shell">
        <div className="state-box">
          <p>{error}</p>
          <Link className="button button-secondary" href="/account/orders">
            返回我的订单
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="account-page shell">
        <p className="state-box">正在读取订单详情…</p>
      </main>
    );
  }

  return (
    <main className="order-page shell">
      <div className="page-heading order-detail-heading">
        <div>
          <p className="eyebrow">CUSTOMER / ORDER DETAIL</p>
          <h1>订单详情</h1>
        </div>
        <span className={`status status-${order.status.toLowerCase()}`}>
          {order.status_label}
        </span>
      </div>

      <div className="order-layout order-detail-layout">
        <section className="order-detail-card">
          {order.product_image_url && (
            <Image
              className="order-detail-image"
              src={mediaUrl(order.product_image_url) ?? ""}
              alt={`${order.product_name}订单商品图`}
              width={320}
              height={400}
              unoptimized
            />
          )}
          <div>
            <span className="mono-note">{order.number}</span>
            <h2>{order.product_name}</h2>
            <p>{order.variant_name} × {order.quantity}</p>
            <strong>参考金额 ¥{order.reference_total}</strong>
          </div>
          <dl className="order-detail-fields">
            <div><dt>联系电话</dt><dd>{order.contact_phone}</dd></div>
            <div><dt>客户微信</dt><dd>{order.wechat_id || "未填写"}</dd></div>
            <div><dt>客户备注</dt><dd>{order.note || "未填写"}</dd></div>
            <div><dt>创建时间</dt><dd>{new Date(order.created_at).toLocaleString("zh-CN")}</dd></div>
          </dl>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="order-detail-actions">
            {order.status === "PENDING_CONFIRMATION" && (
              <button className="button button-secondary" disabled={canceling} onClick={() => void cancelOrder()}>
                {canceling ? "取消中…" : "取消订单"}
              </button>
            )}
            {order.status === "CONFIRMED" && <p>如需取消，请联系管理员处理。</p>}
            <Link className="button button-secondary" href="/account/orders">返回订单列表</Link>
          </div>
        </section>

        <section className="order-contact-card" aria-label="商家微信二维码与联系方式">
          <p className="eyebrow">MERCHANT / CURRENT CONTACT</p>
          <h2>联系商家</h2>
          <p>请添加当前商家微信并发送订单编号。最终价格、付款、地址和交付方式均在线下确认。</p>
          <MerchantContactPanel contact={order.merchant_contact} />
        </section>
      </div>
    </main>
  );
}
