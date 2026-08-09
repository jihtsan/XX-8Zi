import Link from "next/link";
import type { Product } from "@/lib/products";
import { productPrice } from "@/lib/products";
import { ProductVisual } from "./product-visual";

export function ProductCard({ product }: { product: Product }) {
  const inStock = product.variants.some((variant) => variant.inStock);

  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} aria-label={`查看${product.name}`}>
        <ProductVisual product={product} compact />
      </Link>
      <div className="card-meta">
        <span>{product.code}</span>
        <span>{product.category}</span>
      </div>
      <h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
      <div className="card-price">
        <p><small>参考价</small>{productPrice(product)}</p>
        <span className={inStock ? "stock-tag" : "stock-tag sold-out"}>
          {inStock ? "有货" : "已售罄"}
        </span>
      </div>
    </article>
  );
}
