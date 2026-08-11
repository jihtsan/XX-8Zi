import Image from "next/image";
import type { Product } from "@/lib/products";

export function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <div className={`product-visual ${compact ? "product-visual-compact" : ""}`}>
      <Image
        className="product-photo"
        src={product.image}
        alt={`${product.name}水晶手串商品图`}
        fill
        sizes={compact ? "(max-width: 760px) 50vw, 33vw" : "(max-width: 760px) 100vw, 58vw"}
      />
      <div className="product-photo-shade" aria-hidden="true" />
      <span className="visual-code" aria-hidden="true">{product.code}</span>
    </div>
  );
}
