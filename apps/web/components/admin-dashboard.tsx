"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest, mediaUrl } from "@/lib/api";

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

type ProductImage = {
  id: number;
  role: "MAIN" | "GALLERY";
  sort_order: number;
  alt_text: string;
  url: string;
};

type CatalogProduct = {
  id: number;
  category_id: number;
  code: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  material: string;
  status: string;
  sort_order: number;
  images: ProductImage[];
  variants: Variant[];
};

type Category = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
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

type NoticeHandler = (message: string) => void;

function CreateProductForm({
  categories,
  onSaved,
  onNotice,
}: {
  categories: Category[];
  onSaved: () => Promise<void>;
  onNotice: NoticeHandler;
}) {
  const [form, setForm] = useState({
    categoryId: "",
    code: "",
    slug: "",
    name: "",
    description: "",
    material: "",
    sortOrder: "0",
    variantCode: "",
    variantName: "",
    price: "",
    stock: "0",
  });
  const [busy, setBusy] = useState(false);
  const activeCategories = categories.filter((category) => category.active);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          category_id: Number(form.categoryId),
          code: form.code,
          slug: form.slug,
          name: form.name,
          description: form.description,
          material: form.material,
          sort_order: Number(form.sortOrder),
          initial_variant: {
            code: form.variantCode,
            name: form.variantName,
            price_cents: Math.round(Number(form.price) * 100),
            total_stock: Number(form.stock),
            active: true,
          },
        }),
      });
      setForm({
        categoryId: form.categoryId,
        code: "",
        slug: "",
        name: "",
        description: "",
        material: "",
        sortOrder: "0",
        variantCode: "",
        variantName: "",
        price: "",
        stock: "0",
      });
      onNotice("商品草稿和首个可售规格已创建，请继续上传主图后上架");
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "商品创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="admin-create-panel" open>
      <summary>
        <span>＋ 新建商品</span>
        <small>同时定义首个可售规格</small>
      </summary>
      {activeCategories.length === 0 ? (
        <p className="admin-form-help">暂无已启用分类，请先配置商品分类。</p>
      ) : (
        <form className="admin-product-form" onSubmit={createProduct}>
          <fieldset>
            <legend>01 / 商品档案</legend>
            <div className="admin-form-grid">
              <label>
                商品名称
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
              <label>
                商品编号
                <input
                  required
                  maxLength={40}
                  placeholder="CRYSTAL-201"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                />
              </label>
              <label>
                页面路径
                <input
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="moonstone-archive"
                  value={form.slug}
                  onChange={(event) =>
                    setForm({ ...form, slug: event.target.value.toLowerCase() })
                  }
                />
              </label>
              <label>
                分类
                <select
                  required
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm({ ...form, categoryId: event.target.value })
                  }
                >
                  <option value="">请选择</option>
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                首页排序
                <input
                  required
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm({ ...form, sortOrder: event.target.value })
                  }
                />
              </label>
              <label className="admin-form-wide">
                材质
                <input
                  required
                  maxLength={240}
                  value={form.material}
                  onChange={(event) =>
                    setForm({ ...form, material: event.target.value })
                  }
                />
              </label>
              <label className="admin-form-wide">
                商品介绍
                <textarea
                  required
                  rows={3}
                  maxLength={4000}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>02 / 首个可售规格</legend>
            <p className="admin-form-help">
              参考价和库存只属于可售规格，不在商品层重复维护。
            </p>
            <div className="admin-form-grid">
              <label>
                规格名称
                <input
                  required
                  maxLength={120}
                  placeholder="8mm / 16cm"
                  value={form.variantName}
                  onChange={(event) =>
                    setForm({ ...form, variantName: event.target.value })
                  }
                />
              </label>
              <label>
                规格编号
                <input
                  required
                  maxLength={40}
                  placeholder="MOON-8-16"
                  value={form.variantCode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      variantCode: event.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <label>
                参考价（元）
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                />
              </label>
              <label>
                初始库存总量
                <input
                  required
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(event) =>
                    setForm({ ...form, stock: event.target.value })
                  }
                />
              </label>
            </div>
          </fieldset>
          <button className="button button-dark" disabled={busy}>
            {busy ? "创建中…" : "创建商品草稿"}
          </button>
        </form>
      )}
    </details>
  );
}

function ProductEditor({
  product,
  categories,
  onSaved,
  onNotice,
}: {
  product: CatalogProduct;
  categories: Category[];
  onSaved: () => Promise<void>;
  onNotice: NoticeHandler;
}) {
  const [form, setForm] = useState({
    categoryId: String(product.category_id),
    code: product.code,
    slug: product.slug,
    name: product.name,
    description: product.description,
    material: product.material,
    sortOrder: String(product.sort_order),
  });
  const [busy, setBusy] = useState(false);

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest(`/admin/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          category_id: Number(form.categoryId),
          code: form.code,
          slug: form.slug,
          name: form.name,
          description: form.description,
          material: form.material,
          sort_order: Number(form.sortOrder),
        }),
      });
      onNotice(`${form.name}的商品信息已保存`);
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "商品信息保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="admin-edit-panel">
      <summary>编辑商品档案</summary>
      <form className="admin-product-form compact" onSubmit={saveProduct}>
        <div className="admin-form-grid">
          <label>
            商品名称
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            商品编号
            <input
              required
              value={form.code}
              onChange={(event) =>
                setForm({ ...form, code: event.target.value.toUpperCase() })
              }
            />
          </label>
          <label>
            页面路径
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={form.slug}
              onChange={(event) =>
                setForm({ ...form, slug: event.target.value.toLowerCase() })
              }
            />
          </label>
          <label>
            分类
            <select
              required
              value={form.categoryId}
              onChange={(event) =>
                setForm({ ...form, categoryId: event.target.value })
              }
            >
              {categories
                .filter(
                  (category) =>
                    category.active || category.id === product.category_id,
                )
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            首页排序
            <input
              required
              type="number"
              value={form.sortOrder}
              onChange={(event) =>
                setForm({ ...form, sortOrder: event.target.value })
              }
            />
          </label>
          <label className="admin-form-wide">
            材质
            <input
              required
              value={form.material}
              onChange={(event) =>
                setForm({ ...form, material: event.target.value })
              }
            />
          </label>
          <label className="admin-form-wide">
            商品介绍
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
        </div>
        <button className="button button-dark button-compact" disabled={busy}>
          保存商品信息
        </button>
      </form>
    </details>
  );
}

function VariantEditor({
  variant,
  onSaved,
  onNotice,
}: {
  variant: Variant;
  onSaved: () => Promise<void>;
  onNotice: NoticeHandler;
}) {
  const [stock, setStock] = useState(String(variant.total_stock));
  const [price, setPrice] = useState(String(variant.price_cents / 100));
  const [code, setCode] = useState(variant.code);
  const [name, setName] = useState(variant.name);
  const [active, setActive] = useState(variant.active);
  const [busy, setBusy] = useState(false);

  async function saveInventory() {
    setBusy(true);
    try {
      await apiRequest(`/admin/variants/${variant.id}/inventory`, {
        method: "POST",
        body: JSON.stringify({
          total_stock: Number(stock),
          reason: "后台手工调整",
        }),
      });
      onNotice(`${name}的库存总量已调整`);
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "库存调整失败");
    } finally {
      setBusy(false);
    }
  }

  async function saveVariant() {
    setBusy(true);
    try {
      await apiRequest(`/admin/variants/${variant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          code,
          name,
          price_cents: Math.round(Number(price) * 100),
          active,
        }),
      });
      onNotice(`${name}的规格信息已保存`);
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "规格信息保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`variant-admin-card ${active ? "" : "inactive"}`}>
      <div className="variant-fields">
        <label>
          规格名称
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          规格编号
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </label>
        <label>
          参考价（元）
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          启用新订单
        </label>
        <button
          type="button"
          className="button button-dark button-compact"
          disabled={busy}
          onClick={saveVariant}
        >
          保存规格
        </button>
      </div>
      <div className="inventory-editor">
        <dl className="inventory-summary">
          <div>
            <dt>库存总量</dt>
            <dd>{variant.total_stock}</dd>
          </div>
          <div>
            <dt>已预留</dt>
            <dd>{variant.reserved_stock}</dd>
          </div>
          <div>
            <dt>可售库存</dt>
            <dd>{variant.available_stock}</dd>
          </div>
        </dl>
        <label>
          修正库存总量
          <input
            type="number"
            min={variant.reserved_stock}
            value={stock}
            onChange={(event) => setStock(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="button button-dark button-compact"
          disabled={busy}
          onClick={saveInventory}
        >
          调整库存
        </button>
      </div>
      <p className="inventory-help">
        客户下单会增加“已预留”并减少“可售库存”；订单完成后才从库存总量核销。
      </p>
    </article>
  );
}

function CreateVariantForm({
  product,
  onSaved,
  onNotice,
}: {
  product: CatalogProduct;
  onSaved: () => Promise<void>;
  onNotice: NoticeHandler;
}) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    price: "",
    stock: "0",
  });
  const [busy, setBusy] = useState(false);

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiRequest(`/admin/products/${product.id}/variants`, {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          price_cents: Math.round(Number(form.price) * 100),
          total_stock: Number(form.stock),
          active: true,
        }),
      });
      setForm({ code: "", name: "", price: "", stock: "0" });
      onNotice(`${product.name}已新增可售规格`);
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "可售规格创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="admin-add-variant">
      <summary>＋ 新增可售规格</summary>
      <form className="variant-fields" onSubmit={createVariant}>
        <label>
          规格名称
          <input
            required
            placeholder="10mm / 17cm"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          规格编号
          <input
            required
            placeholder="MOON-10-17"
            value={form.code}
            onChange={(event) =>
              setForm({ ...form, code: event.target.value.toUpperCase() })
            }
          />
        </label>
        <label>
          参考价（元）
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) =>
              setForm({ ...form, price: event.target.value })
            }
          />
        </label>
        <label>
          初始库存总量
          <input
            required
            type="number"
            min="0"
            value={form.stock}
            onChange={(event) =>
              setForm({ ...form, stock: event.target.value })
            }
          />
        </label>
        <button className="button button-dark button-compact" disabled={busy}>
          {busy ? "添加中…" : "添加规格"}
        </button>
      </form>
    </details>
  );
}

function ProductImageManager({
  product,
  onSaved,
  onNotice,
}: {
  product: CatalogProduct;
  onSaved: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  async function uploadImages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) return;
    setBusy(true);
    try {
      for (const [index, file] of files.entries()) {
        const body = new FormData();
        body.set("file", file);
        body.set(
          "role",
          product.images.length === 0 && index === 0 ? "MAIN" : "GALLERY",
        );
        body.set("sort_order", String(product.images.length + index));
        body.set("alt_text", `${product.name}商品图`);
        await apiRequest(`/admin/products/${product.id}/images`, {
          method: "POST",
          body,
        });
      }
      setFiles([]);
      onNotice(`已上传 ${files.length} 张商品图片`);
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "图片上传失败");
    } finally {
      setBusy(false);
    }
  }

  async function updateImage(image: ProductImage, body: Partial<ProductImage>) {
    setBusy(true);
    try {
      await apiRequest(`/admin/products/${product.id}/images/${image.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onNotice("图片设置已保存");
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "图片设置保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function deleteImage(image: ProductImage) {
    setBusy(true);
    try {
      await apiRequest(`/admin/products/${product.id}/images/${image.id}`, {
        method: "DELETE",
      });
      onNotice("图片已删除");
      await onSaved();
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : "图片删除失败");
    } finally {
      setBusy(false);
    }
  }

  const orderedImages = [...product.images].sort(
    (left, right) =>
      Number(right.role === "MAIN") - Number(left.role === "MAIN") ||
      left.sort_order - right.sort_order,
  );

  return (
    <section
      className="admin-image-manager"
      aria-label={`${product.name}商品图片`}
    >
      <div className="admin-image-heading">
        <div>
          <strong>商品图片</strong>
          <small>主图 1 张 · 轮播图最多 11 张</small>
        </div>
        <form onSubmit={uploadImages}>
          <label className="file-picker">
            选择图片
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) =>
                setFiles(Array.from(event.target.files ?? []))
              }
            />
          </label>
          <button
            className="button button-dark button-compact"
            disabled={busy || files.length === 0}
          >
            {busy
              ? "处理中…"
              : `上传${files.length ? ` ${files.length} 张` : ""}`}
          </button>
        </form>
      </div>
      {orderedImages.length === 0 ? (
        <p className="admin-image-empty">
          暂无图片。上传的第一张图片会自动设为主图，上架前必须有主图。
        </p>
      ) : (
        <div className="admin-image-list">
          {orderedImages.map((image) => (
            <article key={image.id} className="admin-image-item">
              <div className="admin-image-preview">
                <Image
                  src={image.url}
                  alt={image.alt_text}
                  fill
                  unoptimized
                  sizes="96px"
                />
              </div>
              <div>
                <strong>{image.role === "MAIN" ? "主图" : "轮播图"}</strong>
                <small>排序 {image.sort_order}</small>
              </div>
              <div className="admin-image-actions">
                {image.role !== "MAIN" && (
                  <button
                    disabled={busy}
                    onClick={() => void updateImage(image, { role: "MAIN" })}
                  >
                    设为主图
                  </button>
                )}
                <button
                  disabled={busy || image.sort_order === 0}
                  aria-label="向前排序"
                  onClick={() =>
                    void updateImage(image, {
                      sort_order: Math.max(0, image.sort_order - 1),
                    })
                  }
                >
                  ←
                </button>
                <button
                  disabled={busy}
                  aria-label="向后排序"
                  onClick={() =>
                    void updateImage(image, {
                      sort_order: image.sort_order + 1,
                    })
                  }
                >
                  →
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => void deleteImage(image)}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<MerchantSettings | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [
        dashboard,
        catalogPayload,
        categoryPayload,
        customerPayload,
        settingsPayload,
      ] = await Promise.all([
        apiRequest<Dashboard>("/admin/dashboard"),
        apiRequest<CatalogProduct[]>("/admin/catalog"),
        apiRequest<Category[]>("/admin/categories"),
        apiRequest<Customer[]>("/admin/customers"),
        apiRequest<MerchantSettings>("/admin/merchant-settings"),
      ]);
      setData(dashboard);
      setCatalog(
        catalogPayload.map((product) => ({
          ...product,
          images: product.images.map((image) => ({
            ...image,
            url: mediaUrl(image.url) ?? "",
          })),
        })),
      );
      setCategories(categoryPayload);
      setCustomers(customerPayload);
      setSettings(settingsPayload);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "后台数据读取失败");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

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
        body: JSON.stringify({
          status,
          return_to_stock: true,
          admin_note: "后台状态处理",
        }),
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
    return (
      <main className="admin-page">
        <div className="admin-login-state">
          <p>{error}</p>
          <Link className="button button-primary" href="/admin/login">
            后台登录
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <div>
          <span>◇</span>
          <strong>玄序控制台</strong>
          <small>ADMIN / CTRL</small>
        </div>
        <nav>
          <a className="active" href="#overview">
            总览
          </a>
          <a href="#products">商品与库存</a>
          <a href="#orders">订单</a>
          <a href="#customers">客户</a>
          <a href="#settings">商家配置</a>
        </nav>
      </aside>
      <section className="admin-content">
        <header>
          <div>
            <p className="eyebrow">CONTROL PANEL / LIVE DATA</p>
            <h1>运营总览</h1>
          </div>
          <span className="status">系统运行中</span>
        </header>
        {notice && (
          <p className="admin-notice" role="status">
            {notice}
          </p>
        )}
        {!data ? (
          <p className="state-box light">正在同步业务数据…</p>
        ) : (
          <>
            <div className="metric-grid" id="overview">
              <article>
                <small>商品档案</small>
                <strong>{data.products}</strong>
                <span>{data.active_products} 件上架</span>
              </article>
              <article>
                <small>待确认订单</small>
                <strong>{data.pending_orders}</strong>
                <span>请及时联系客户</span>
              </article>
              <article>
                <small>商城客户</small>
                <strong>{data.customers}</strong>
                <span>仅保存必要信息</span>
              </article>
              <article>
                <small>系统状态</small>
                <strong>OK</strong>
                <span>SQLite / API ONLINE</span>
              </article>
            </div>

            <section className="admin-table-section" id="products">
              <div className="admin-section-heading">
                <div>
                  <span className="mono-note">CATALOG / PUBLISHING</span>
                  <h2>商品上架</h2>
                </div>
                <a
                  className="button button-dark button-compact"
                  href="#create-product"
                >
                  新建商品
                </a>
              </div>
              <ol className="admin-workflow" aria-label="商品上架步骤">
                <li>
                  <span>01</span>
                  <strong>创建商品草稿</strong>
                  <small>填写商品档案与首个可售规格</small>
                </li>
                <li>
                  <span>02</span>
                  <strong>上传主图</strong>
                  <small>第一张图片自动成为主图</small>
                </li>
                <li>
                  <span>03</span>
                  <strong>核对库存</strong>
                  <small>总量 − 已预留 = 可售库存</small>
                </li>
                <li>
                  <span>04</span>
                  <strong>设置为上架</strong>
                  <small>商品自动出现在首页</small>
                </li>
              </ol>
              <div id="create-product">
                <CreateProductForm
                  categories={categories}
                  onSaved={refresh}
                  onNotice={setNotice}
                />
              </div>
              <div className="admin-product-list">
                {catalog.map((product) => (
                  <article key={product.id} className="admin-product-card">
                    <header>
                      <div>
                        <span className="mono-note">
                          {product.code} / {product.category}
                        </span>
                        <h3>{product.name}</h3>
                        <div className="publish-readiness">
                          <span
                            className={
                              product.images.some(
                                (image) => image.role === "MAIN",
                              )
                                ? "ready"
                                : ""
                            }
                          >
                            主图
                          </span>
                          <span
                            className={
                              product.variants.some((variant) => variant.active)
                                ? "ready"
                                : ""
                            }
                          >
                            可售规格
                          </span>
                          {product.status === "PUBLISHED" && (
                            <Link href={`/products/${product.slug}`}>
                              查看首页商品 →
                            </Link>
                          )}
                        </div>
                      </div>
                      <label>
                        商品状态
                        <select
                          value={product.status}
                          onChange={(event) =>
                            void mutate(`/admin/products/${product.id}`, {
                              status: event.target.value,
                            })
                          }
                        >
                          <option value="DRAFT">草稿</option>
                          <option value="PUBLISHED">上架</option>
                          <option value="UNPUBLISHED">下架</option>
                        </select>
                      </label>
                    </header>
                    <ProductEditor
                      key={`${product.id}:${product.code}:${product.slug}:${product.name}:${product.category_id}:${product.sort_order}`}
                      product={product}
                      categories={categories}
                      onSaved={refresh}
                      onNotice={setNotice}
                    />
                    <ProductImageManager
                      product={product}
                      onSaved={refresh}
                      onNotice={setNotice}
                    />
                    <div className="admin-variant-heading">
                      <div>
                        <strong>可售规格与库存</strong>
                        <small>每个规格独立维护参考价和库存</small>
                      </div>
                      <span>{product.variants.length} 个规格</span>
                    </div>
                    <div className="admin-variant-list">
                      {product.variants.map((variant) => (
                        <VariantEditor
                          key={`${variant.id}:${variant.code}:${variant.name}:${variant.price_cents}:${variant.total_stock}:${variant.reserved_stock}:${variant.active}`}
                          variant={variant}
                          onSaved={refresh}
                          onNotice={setNotice}
                        />
                      ))}
                    </div>
                    <CreateVariantForm
                      product={product}
                      onSaved={refresh}
                      onNotice={setNotice}
                    />
                  </article>
                ))}
                {catalog.length === 0 && (
                  <p className="admin-empty">
                    暂无商品。先创建商品草稿和首个可售规格。
                  </p>
                )}
              </div>
            </section>

            <section className="admin-table-section" id="orders">
              <div className="admin-section-heading">
                <div>
                  <span className="mono-note">ORDER QUEUE</span>
                  <h2>最近订单</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>订单编号</th>
                      <th>商品</th>
                      <th>联系电话</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="mono-note">{order.number}</td>
                        <td>{order.product_name}</td>
                        <td>{order.contact_phone}</td>
                        <td>
                          <span className="status">{order.status_label}</span>
                        </td>
                        <td>
                          <div className="table-actions">
                            {order.status === "PENDING_CONFIRMATION" && (
                              <button
                                onClick={() =>
                                  void changeOrder(order, "CONFIRMED")
                                }
                              >
                                确认
                              </button>
                            )}
                            {order.status === "CONFIRMED" && (
                              <button
                                onClick={() =>
                                  void changeOrder(order, "COMPLETED")
                                }
                              >
                                完成
                              </button>
                            )}
                            {["PENDING_CONFIRMATION", "CONFIRMED"].includes(
                              order.status,
                            ) && (
                              <button
                                onClick={() =>
                                  void changeOrder(order, "CANCELED")
                                }
                              >
                                取消
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.orders.length === 0 && (
                      <tr>
                        <td colSpan={5}>暂无订单</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-table-section" id="customers">
              <div className="admin-section-heading">
                <div>
                  <span className="mono-note">CUSTOMER ACCESS</span>
                  <h2>客户管理</h2>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>手机号</th>
                      <th>注册时间</th>
                      <th>最近登录</th>
                      <th>账户</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>{customer.phone}</td>
                        <td>
                          {new Date(customer.created_at).toLocaleDateString(
                            "zh-CN",
                          )}
                        </td>
                        <td>
                          {customer.last_login_at
                            ? new Date(customer.last_login_at).toLocaleString(
                                "zh-CN",
                              )
                            : "—"}
                        </td>
                        <td>
                          <button
                            className="table-button"
                            onClick={() =>
                              void mutate(`/admin/customers/${customer.id}`, {
                                active: !customer.active,
                              })
                            }
                          >
                            {customer.active ? "停用" : "启用"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {settings && (
              <section className="admin-table-section" id="settings">
                <div className="admin-section-heading">
                  <div>
                    <span className="mono-note">MERCHANT CONTACT</span>
                    <h2>商家微信配置</h2>
                  </div>
                </div>
                <form className="admin-settings-form" onSubmit={saveSettings}>
                  <label>
                    微信号
                    <input
                      value={settings.wechat_id}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          wechat_id: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    二维码图片 URL
                    <input
                      value={settings.qr_image_url ?? ""}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          qr_image_url: event.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label>
                    联系说明
                    <textarea
                      rows={3}
                      value={settings.contact_note}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          contact_note: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <button className="button button-dark">保存配置</button>
                </form>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
