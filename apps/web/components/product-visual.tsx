"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/products";

export function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  const [activeImageId, setActiveImageId] = useState(product.images[0]?.id);
  const activeImage = product.images.find((image) => image.id === activeImageId) ?? product.images[0];

  if (!activeImage) {
    return <div className={`product-visual product-visual-empty ${compact ? "product-visual-compact" : ""}`}>暂无商品图片</div>;
  }

  return (
    <div className={`product-gallery ${compact ? "product-gallery-compact" : ""}`}>
      <div className={`product-visual ${compact ? "product-visual-compact" : ""}`}>
        <Image
          className="product-photo"
          src={activeImage.url}
          alt={activeImage.altText}
          fill
          unoptimized
          sizes={compact ? "(max-width: 760px) 50vw, 33vw" : "(max-width: 760px) 100vw, 58vw"}
        />
        <div className="product-photo-shade" aria-hidden="true" />
        <span className="visual-code" aria-hidden="true">{product.code}</span>
      </div>
      {!compact && product.images.length > 1 && (
        <div className="product-thumbnails" aria-label="商品图片">
          {product.images.map((image) => (
            <button
              key={image.id}
              type="button"
              className={image.id === activeImage.id ? "active" : ""}
              aria-label={`查看${image.altText}`}
              aria-pressed={image.id === activeImage.id}
              onClick={() => setActiveImageId(image.id)}
            >
              <Image src={image.url} alt="" fill unoptimized sizes="88px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
