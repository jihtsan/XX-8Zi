import type { CSSProperties } from "react";
import type { Product } from "@/lib/products";

export function ProductVisual({ product, compact = false }: { product: Product; compact?: boolean }) {
  const style = {
    "--bead-primary": product.tone.primary,
    "--bead-secondary": product.tone.secondary,
    "--bead-glow": product.tone.glow,
  } as CSSProperties;

  return (
    <div
      className={`product-visual ${compact ? "product-visual-compact" : ""}`}
      style={style}
      role="img"
      aria-label={`${product.name}珠串示意图`}
    >
      <div className="visual-grid" aria-hidden="true" />
      <div className="bead-ring" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span key={index} style={{ "--bead-index": index } as CSSProperties} />
        ))}
      </div>
      <span className="visual-code" aria-hidden="true">{product.code}</span>
    </div>
  );
}
