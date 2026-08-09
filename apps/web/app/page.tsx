import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { fetchProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "玄序 · 矿物与珠串档案",
  description: "水晶手串、佛珠与天然饰品的数字档案商城。",
};

export default async function Home() {
  const products = await fetchProducts();
  return (
    <main>
      <section className="hero shell">
        <Reveal className="hero-copy">
          <p className="eyebrow">ARCHIVE / COLLECTION 01</p>
          <h1>
            每一串
            <br />
            都有自己的秩序
          </h1>
          <p className="hero-summary">
            水晶、木质与佛珠饰品的当代矿物档案。浏览天然纹理，选择适合你的尺寸，
            最终价格与交付方式由商家通过微信确认。
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#catalog">
              浏览档案
            </a>
            <span className="mono-note">STATUS / ONLINE</span>
          </div>
        </Reveal>

        <Reveal className="hero-orbit" delay={0.1} ariaLabel="珠串轨道装饰">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core">◇</div>
          <p>MINERAL SIGNAL</p>
        </Reveal>
      </section>

      <section className="index-strip" aria-label="商品分类">
        <div className="shell index-grid">
          <a href="#catalog"><span>01</span>水晶系列</a>
          <a href="#catalog"><span>02</span>木质佛珠</a>
          <a href="#catalog"><span>03</span>天然饰品</a>
          <p className="index-mark">○ ○ ○ ○ ○ ○</p>
        </div>
      </section>

      <section className="catalog shell" id="catalog">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SPECIMEN INDEX / {String(products.length).padStart(2, "0")} ITEMS</p>
            <h2>本期上架</h2>
          </div>
          <p>商品实拍将保留天然色差与包裹体，每件纹理可能略有不同。</p>
        </div>
        <div className="product-grid">
          {products.map((product, index) => (
            <Reveal key={product.slug} delay={Math.min(index * 0.05, 0.2)}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="manifesto shell">
        <p className="eyebrow">MATERIAL / FORM / TIME</p>
        <p className="manifesto-copy">
          我们记录材质，而不许诺功效；呈现天然差异，也尊重每一次个人选择。
        </p>
        <div className="manifesto-code">XX8Z / ARCHIVE / 2026</div>
      </section>
    </main>
  );
}
