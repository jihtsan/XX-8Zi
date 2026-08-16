import type { Metadata } from "next";
import Link from "next/link";
import { AMapLocation } from "@/components/amap-location";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "关于我们 · 玄序",
  description: "了解玄序的选品方式、联系信息与到访位置。",
  openGraph: {
    title: "关于我们 · 玄序",
    description: "了解玄序的选品方式、联系信息与到访位置。",
  },
  twitter: {
    title: "关于我们 · 玄序",
    description: "了解玄序的选品方式、联系信息与到访位置。",
  },
};

const DEFAULT_CENTER: [number, number] = [121.473667, 31.230525];

function finiteCoordinate(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function amapServiceHost() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  try {
    return `${new URL(apiUrl).origin}/_AMapService`;
  } catch {
    return "http://localhost:8000/_AMapService";
  }
}

export default function AboutPage() {
  const configuredAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim();
  const address = configuredAddress || "上海市（详细地址请提前联系商家确认）";
  const locationName = configuredAddress ? "玄序联系地址" : "玄序上海服务区域";
  const center: [number, number] = [
    finiteCoordinate(process.env.NEXT_PUBLIC_AMAP_LONGITUDE, DEFAULT_CENTER[0]),
    finiteCoordinate(process.env.NEXT_PUBLIC_AMAP_LATITUDE, DEFAULT_CENTER[1]),
  ];
  const directionsUrl = `https://uri.amap.com/marker?position=${center.join(",")}&name=${encodeURIComponent(locationName)}&src=xuanxu&coordinate=gaode&callnative=1`;

  return (
    <main className="about-page shell">
      <Reveal className="about-hero">
        <div>
          <p className="eyebrow">ABOUT / XUANXU ARCHIVE</p>
          <h1>
            关于玄序
            <br />
            也关于每一件天然之物
          </h1>
        </div>
        <p>
          我们以档案的方式记录水晶与珠串，保留天然纹理、色差与包裹体。
          不夸大功效，也不替客户做判断，只提供清晰的材质信息和可以慢慢选择的空间。
        </p>
      </Reveal>

      <section className="about-values" aria-labelledby="about-values-title">
        <div className="about-section-heading">
          <p className="eyebrow">OUR APPROACH / 03 RECORDS</p>
          <h2 id="about-values-title">我们如何整理一件商品</h2>
        </div>
        <div className="about-value-grid">
          <article>
            <span>01</span>
            <h3>记录天然差异</h3>
            <p>尽量使用真实影像呈现色泽与纹理，不把每一件天然材质修成完全相同。</p>
          </article>
          <article>
            <span>02</span>
            <h3>说明规格与参考价</h3>
            <p>把珠径、手围、材质与参考价清楚列出，最终价格和交付方式通过微信确认。</p>
          </article>
          <article>
            <span>03</span>
            <h3>尊重个人选择</h3>
            <p>不作疗效、转运或命理承诺，让材质本身和你的真实偏好成为选择依据。</p>
          </article>
        </div>
      </section>

      <section className="about-location" aria-labelledby="location-title">
        <div className="location-copy">
          <p className="eyebrow">CONTACT / LOCATION</p>
          <h2 id="location-title">联系我们</h2>
          <p>
            如需了解商品细节或预约到访，请先提交订单或通过订单详情中的商家微信联系我们。
            我们会与你确认最终价格、地址和交付方式。
          </p>
          <dl>
            <div>
              <dt>联系区域</dt>
              <dd>{address}</dd>
            </div>
            <div>
              <dt>到访方式</dt>
              <dd>{process.env.NEXT_PUBLIC_BUSINESS_HOURS?.trim() || "预约到访"}</dd>
            </div>
            <div>
              <dt>站内入口</dt>
              <dd>
                <Link href="/account/orders">我的订单 →</Link>
              </dd>
            </div>
          </dl>
          <a className="button button-secondary" href={directionsUrl} target="_blank" rel="noreferrer">
            在高德地图中打开
          </a>
        </div>
        <AMapLocation
          address={address}
          apiKey={process.env.NEXT_PUBLIC_AMAP_KEY?.trim() ?? ""}
          center={center}
          locationName={locationName}
          serviceHost={amapServiceHost()}
        />
      </section>
    </main>
  );
}
