"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";

export function PurchaseSelector({ product }: { product: Product }) {
  const available = product.variants.filter((variant) => variant.inStock);
  const [variantId, setVariantId] = useState(available[0]?.id ?? product.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const selected = product.variants.find((variant) => variant.id === variantId)!;

  return (
    <div className="purchase-form">
      <p className="field-label">选择规格</p>
      <div className="variant-options">
        {product.variants.map((variant) => (
          <button
            type="button"
            key={variant.id}
            disabled={!variant.inStock}
            className={variant.id === variantId ? "variant-active" : ""}
            onClick={() => setVariantId(variant.id)}
          >
            <span>{variant.name}</span>
            <small>{variant.inStock ? formatPrice(variant.price) : "已售罄"}</small>
          </button>
        ))}
      </div>

      <div className="quantity-row">
        <span className="field-label">数量</span>
        <div className="quantity-control">
          <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="减少数量">−</button>
          <output>{quantity}</output>
          <button type="button" onClick={() => setQuantity(Math.min(9, quantity + 1))} aria-label="增加数量">＋</button>
        </div>
      </div>

      <div className="reference-total">
        <span>参考金额</span>
        <strong>{formatPrice(selected.price * quantity)}</strong>
      </div>
      <button
        className="button button-primary buy-button"
        type="button"
        disabled={!selected.inStock}
        onClick={() => router.push(`/orders/confirm?variant=${variantId}&quantity=${quantity}`)}
      >
        {selected.inStock ? "立即购买" : "当前规格已售罄"}
      </button>
      <p className="form-note">登录后提交购买意向；最终价格、付款和交付方式通过微信确认。</p>
    </div>
  );
}
