import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("order submission reuses one idempotency key and navigates by order id", async () => {
  const source = await read("../components/order-confirm.tsx");

  assert.match(source, /useRef<string \| null>\(null\)/);
  assert.match(source, /idempotencyKey\.current \?\?= crypto\.randomUUID\(\)/);
  assert.match(source, /`\/orders\/success\?order=\$\{order\.id\}`/);
});

test("success page validates the owned order before showing merchant contact", async () => {
  const source = await read("../components/order-success.tsx");

  assert.match(source, /apiRequest<OrderDetail>\(`\/orders\/\$\{orderId\}`\)/);
  assert.match(source, /order\.merchant_contact/);
  assert.doesNotMatch(source, /get\("number"\)/);
});

test("customer order list links to a contact-enabled order detail", async () => {
  const [list, detail, page] = await Promise.all([
    read("../components/orders-list.tsx"),
    read("../components/order-detail.tsx"),
    read("../app/account/orders/[id]/page.tsx"),
  ]);

  assert.match(list, /`\/account\/orders\/\$\{order\.id\}`/);
  assert.match(detail, /merchant_contact/);
  assert.match(detail, /商家微信二维码/);
  assert.match(page, /<OrderDetail orderId=\{Number\(id\)\} \/>/);
});

test("admin uploads the merchant QR image instead of entering a URL", async () => {
  const source = await read("../components/admin-dashboard.tsx");

  assert.match(source, /\/admin\/merchant-settings\/qr-code/);
  assert.match(source, /new FormData\(\)/);
  assert.match(source, /type="file"/);
  assert.doesNotMatch(source, /二维码图片 URL/);
});
