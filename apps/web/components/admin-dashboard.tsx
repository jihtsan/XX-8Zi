"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Order = {
  id: number;
  number: string;
  product_name: string;
  contact_phone: string;
  status: string;
  status_label: string;
  created_at: string;
};

type Dashboard = {
  products: number;
  active_products: number;
  pending_orders: number;
  customers: number;
  orders: Order[];
};

type Variant = {
  id: number;
  code: string;
  name: string;
  price_cents: number;
  total_stock: number;
  reserved_stock: number;
  available_stock: number;
  active: boolean;
};

type CatalogProduct = {
  id: number;
  code: string;
  name: string;
  category: string;
  status: string;
  variants: Variant[];
};

type Customer = {
  id: number;
  phone: string;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
};

type MerchantSettings = {
  wechat_id: string;
  qr_image_url: string | null;
  contact_note: string;
};

function InventoryEditor({ variant, onSaved }: { variant: Variant; onSaved: () => Promise<void> }) {
  const [stock, setStock] = useState(String(variant.total_stock));
  const [price, setPrice] = useState(String(variant.price_cents / 100));
  const [busy, setBusy] = useState(false);

  async function saveInventory() {
    setBusy(true);
    try {
      await apiRequest(`/admin/variants/${variant.id}/inventory`, {
        method: "POST",
        body: JSON.stringify({ total_stock: Number(stock), reason: "后台手工调整" }),
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function saveVariant() {
    setBusy(true);
    try {
      await apiRequest(`/admin/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ price_cents: Math.round(Number(price) * 100) }),
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="variant-admin-row">
      <div><strong>{variant.name}</strong><small>{variant.code}</small></div>
      <label>参考价<input type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
      <button className="button button-dark button-compact" disabled={busy} onClick={saveVariant}>保存价格</button>
      <label>库存总量<input type="number" min={variant.reserved_stock} value={stock} onChange={(event) => setStock(event.target.value)} /></label>
      <button className="button button-dark button-compact" disabled={busy} onClick={saveInventory}>调整库存</button>
      <span>预留 {variant.reserved_stock} / 可售 {variant.available_stock}</span>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [dashboard, catalogPayload, customerPayload, settingsPayload] = await Promise.all([
        apiRequest<Dashboard>("/admin/dashboard"),
        apiRequest<CatalogProduct[]>("/admin/catalog"),
        apiRequest<Customer[]>("/admin/customers"),
        apiRequest<MerchantSettings>("/admin/merchant-settings"),
      ]);
      setData(dashboard);
      setCatalog(catalogPayload);
      setCustomers(customerPayload);
      setSettings(settingsPayload);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "后台数据读取失败");
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  async function mutate(path: string, body: unknown) {
    try {
      setNotice("");
      await apiRequest(path, { method: "PATCH", body: JSON.stringify(body) });
      setNotice("保存成功");
      await refresh();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "保存失败");
    }
  }

  async function changeOrder(order: Order, status: string) {
    try {
      setNotice("");
      await apiRequest(`/admin/orders/${order.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, return_to_stock: true, admin_note: "后台状态处理" }),
      });
      setNotice(`订单 ${order.number} 已更新`);
      await refresh();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "订单更新失败");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    await mutate("/admin/merchant-settings", settings);
  }

  if (error && !data) {
    return <main className="admin-page"><div className="admin-login-state"><p>{error}</p><Link className="button button-primary" href="/login">后台登录</Link></div></main>;
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div><span>◇</span><strong>玄序控制台</strong><small>ADMIN / CTRL</small></div>
        <nav><a className="active" href="#overview">总览</a><a href="#products">商品与库存</a><a href="#orders">订单</a><a href="#customers">客户</a><a href="#settings">商家配置</a></nav>
      </aside>
      <section className="admin-content">
        <header><div><p className="eyebrow">CONTROL PANEL / LIVE DATA</p><h1>运营总览</h1></div><span className="status">系统运行中</span></header>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {!data ? <p className="state-box light">正在同步业务数据…</p> : (
          <>
            <div className="metric-grid" id="overview">
              <article><small>商品档案</small><strong>{data.products}</strong><span>{data.active_products} 件上架</span></article>
              <article><small>待确认订单</small><strong>{data.pending_orders}</strong><span>请及时联系客户</span></article>
              <article><small>商城客户</small><strong>{data.customers}</strong><span>仅保存必要信息</span></article>
              <article><small>系统状态</small><strong>OK</strong><span>SQLite / API ONLINE</span></article>
            </div>

            <section className="admin-table-section" id="products">
              <div className="admin-section-heading"><div><span className="mono-note">CATALOG / INVENTORY</span><h2>商品与库存</h2></div></div>
              <div className="admin-product-list">
                {catalog.map((product) => (
                  <article key={product.id} className="admin-product-card">
                    <header><div><span className="mono-note">{product.code} / {product.category}</span><h3>{product.name}</h3></div><label>商品状态<select value={product.status} onChange={(event) => void mutate(`/admin/products/${product.id}`, { status: event.target.value })}><option value="DRAFT">草稿</option><option value="PUBLISHED">上架</option><option value="UNPUBLISHED">下架</option></select></label></header>
                    {product.variants.map((variant) => <InventoryEditor key={variant.id} variant={variant} onSaved={refresh} />)}
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-table-section" id="orders">
              <div className="admin-section-heading"><div><span className="mono-note">ORDER QUEUE</span><h2>最近订单</h2></div></div>
              <div className="admin-table-wrap"><table><thead><tr><th>订单编号</th><th>商品</th><th>联系电话</th><th>状态</th><th>操作</th></tr></thead><tbody>
                {data.orders.map((order) => <tr key={order.id}><td className="mono-note">{order.number}</td><td>{order.product_name}</td><td>{order.contact_phone}</td><td><span className="status">{order.status_label}</span></td><td><div className="table-actions">{order.status === "PENDING_CONFIRMATION" && <button onClick={() => void changeOrder(order, "CONFIRMED")}>确认</button>}{order.status === "CONFIRMED" && <button onClick={() => void changeOrder(order, "COMPLETED")}>完成</button>}{["PENDING_CONFIRMATION", "CONFIRMED"].includes(order.status) && <button onClick={() => void changeOrder(order, "CANCELED")}>取消</button>}</div></td></tr>)}
                {data.orders.length === 0 && <tr><td colSpan={5}>暂无订单</td></tr>}
              </tbody></table></div>
            </section>

            <section className="admin-table-section" id="customers">
              <div className="admin-section-heading"><div><span className="mono-note">CUSTOMER ACCESS</span><h2>客户管理</h2></div></div>
              <div className="admin-table-wrap"><table><thead><tr><th>手机号</th><th>注册时间</th><th>最近登录</th><th>账户</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td>{customer.phone}</td><td>{new Date(customer.created_at).toLocaleDateString("zh-CN")}</td><td>{customer.last_login_at ? new Date(customer.last_login_at).toLocaleString("zh-CN") : "—"}</td><td><button className="table-button" onClick={() => void mutate(`/admin/customers/${customer.id}`, { active: !customer.active })}>{customer.active ? "停用" : "启用"}</button></td></tr>)}</tbody></table></div>
            </section>

            {settings && <section className="admin-table-section" id="settings"><div className="admin-section-heading"><div><span className="mono-note">MERCHANT CONTACT</span><h2>商家微信配置</h2></div></div><form className="admin-settings-form" onSubmit={saveSettings}><label>微信号<input value={settings.wechat_id} onChange={(event) => setSettings({ ...settings, wechat_id: event.target.value })} required /></label><label>二维码图片 URL<input value={settings.qr_image_url ?? ""} onChange={(event) => setSettings({ ...settings, qr_image_url: event.target.value || null })} /></label><label>联系说明<textarea rows={3} value={settings.contact_note} onChange={(event) => setSettings({ ...settings, contact_note: event.target.value })} required /></label><button className="button button-dark">保存配置</button></form></section>}
          </>
        )}
      </section>
    </main>
  );
}
