import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PurchaseSelector } from "@/components/purchase-selector";
import { ProductVisual } from "@/components/product-visual";
import { fetchProduct, products } from "@/lib/products";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  return { title: product?.name ?? "商品档案" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  return (
    <main className="product-page shell">
      <div className="product-detail-grid">
        <ProductVisual product={product} />
        <section className="purchase-panel">
          <div className="detail-code">
            <span>{product.code}</span>
            <span>{product.category}</span>
          </div>
          <h1>{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <PurchaseSelector product={product} />
        </section>
      </div>

      <section className="material-record">
        <div>
          <p className="eyebrow">MATERIAL RECORD</p>
          <h2>材质档案</h2>
        </div>
        <dl>
          <div><dt>主要材质</dt><dd>{product.material}</dd></div>
          <div><dt>天然差异</dt><dd>颜色、纹理、包裹体与珠体细节可能略有不同</dd></div>
          <div><dt>价格说明</dt><dd>页面为参考价，最终价格以商家微信确认为准</dd></div>
          <div><dt>交付方式</dt><dd>下单后通过微信确认地址、付款与交付</dd></div>
        </dl>
      </section>
    </main>
  );
}
