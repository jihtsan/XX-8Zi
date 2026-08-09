"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type MerchantSettings = { wechat_id: string; qr_image_url: string | null; contact_note: string };

export function OrderSuccess() {
  const number = useSearchParams().get("number") ?? "PENDING";
  const [settings, setSettings] = useState<MerchantSettings>({
    wechat_id: "XUANXU_STORE",
    qr_image_url: null,
    contact_note: "添加时请备注订单编号。",
  });

  useEffect(() => {
    apiRequest<MerchantSettings>("/merchant-settings").then(setSettings).catch(() => undefined);
  }, []);

  return (
    <main className="success-page shell">
      <section className="success-card">
        <p className="eyebrow">ORDER CREATED / PENDING CONFIRMATION</p>
        <span className="success-symbol">◇</span>
        <h1>订单已提交</h1>
        <p>请添加商家微信并发送订单编号，双方将在线下确认最终价格与交付方式。</p>
        <div className="order-number"><small>订单编号</small><strong>{number}</strong></div>
        <div className="wechat-panel">
          <div
            className={`qr-placeholder${settings.qr_image_url ? " has-image" : ""}`}
            aria-label="商家微信二维码"
            style={settings.qr_image_url ? { backgroundImage: `url(${settings.qr_image_url})` } : undefined}
          >
            {!settings.qr_image_url && <><span>WECHAT</span><small>二维码由后台配置</small></>}
          </div>
          <div><small>商家微信</small><strong>{settings.wechat_id}</strong><p>{settings.contact_note}</p></div>
        </div>
        <div className="success-actions">
          <Link className="button button-primary" href="/account/orders">查看订单</Link>
          <Link className="button button-secondary" href="/">继续浏览</Link>
        </div>
      </section>
    </main>
  );
}
