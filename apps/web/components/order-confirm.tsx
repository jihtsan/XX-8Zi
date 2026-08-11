"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { fetchProducts, formatPrice, products, type Product } from "@/lib/products";
import { ProductVisual } from "./product-visual";

type CurrentUser = { phone: string };
type CreatedOrder = { number: string };

export function OrderConfirm() {
  const search = useSearchParams();
  const router = useRouter();
  const variantId = Number(search.get("variant") ?? 1);
  const quantity = Math.max(1, Number(search.get("quantity") ?? 1));
  const [catalog, setCatalog] = useState<Product[]>(products);
  const product = useMemo(() => catalog.find((item) => item.variants.some((variant) => variant.id === variantId)) ?? catalog[0], [catalog, variantId]);
  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  const [phone, setPhone] = useState("");
  const [wechat, setWechat] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts().then(setCatalog).catch(() => undefined);
    apiRequest<CurrentUser>("/auth/me")
      .then((user) => setPhone(user.phone))
      .catch(() => router.replace(`/login?next=${encodeURIComponent(`/orders/confirm?variant=${variantId}&quantity=${quantity}`)}`));
  }, [quantity, router, variantId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const order = await apiRequest<CreatedOrder>("/orders", {
        method: "POST",
        body: JSON.stringify({
          variant_id: variant.id,
          quantity,
          contact_phone: phone,
          wechat_id: wechat || null,
          note: note || null,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      router.push(`/orders/success?number=${encodeURIComponent(order.number)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "订单提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="order-page shell">
      <div className="page-heading">
        <p className="eyebrow">ORDER / INTENT RECORD</p>
        <h1>确认购买意向</h1>
      </div>
      <div className="order-layout">
        <section className="order-summary">
          <ProductVisual product={product} compact />
          <div>
            <span className="mono-note">{product.code}</span>
            <h2>{product.name}</h2>
            <p>{variant.name} × {quantity}</p>
            <strong>参考金额 {formatPrice(variant.price * quantity)}</strong>
          </div>
        </section>
        <form className="order-form" onSubmit={submit}>
          <label>联系电话<input value={phone} onChange={(event) => setPhone(event.target.value)} required /></label>
          <label>微信号（选填）<input value={wechat} onChange={(event) => setWechat(event.target.value)} /></label>
          <label>备注（选填）<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} /></label>
          <div className="notice-box">
            本页面提交的是购买意向，不代表已经付款。最终价格、收货地址、付款和交付方式需与商家私聊确认。
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={loading}>{loading ? "提交中…" : "提交订单"}</button>
        </form>
      </div>
    </main>
  );
}
