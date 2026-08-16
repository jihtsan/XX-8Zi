import { mediaUrl } from "@/lib/api";
import type { MerchantContact } from "@/lib/orders";

export function MerchantContactPanel({ contact }: { contact: MerchantContact }) {
  const qrImage = mediaUrl(contact.qr_image_url);

  return (
    <div className="wechat-panel">
      <div
        className={`qr-placeholder${qrImage ? " has-image" : ""}`}
        aria-label="商家微信二维码"
        style={qrImage ? { backgroundImage: `url(${qrImage})` } : undefined}
      >
        {!qrImage && (
          <>
            <span>WECHAT</span>
            <small>二维码由后台配置</small>
          </>
        )}
      </div>
      <div>
        <small>当前商家微信</small>
        <strong>{contact.wechat_id || "待商家配置"}</strong>
        <p>{contact.contact_note}</p>
      </div>
    </div>
  );
}
