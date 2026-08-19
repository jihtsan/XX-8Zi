import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin catalog exposes the complete product publishing workflow", async () => {
  const source = await readFile(
    new URL("../components/admin-dashboard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /新建商品/);
  assert.match(source, /首个可售规格/);
  assert.match(source, /新增可售规格/);
  assert.match(source, /库存总量/);
  assert.match(source, /已预留/);
  assert.match(source, /可售库存/);
  assert.match(source, /apiRequest\("\/admin\/products"/);
  assert.match(source, /`\/admin\/products\/\$\{product\.id\}\/variants`/);
});

test("storefront only uses demo products when the explicit demo flag is enabled", async () => {
  const source = await readFile(
    new URL("../lib/products.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /NEXT_PUBLIC_ENABLE_DEMO_CATALOG === "true"/);
  assert.match(source, /if \(!response\.ok\) return demoCatalogFallback\(\)/);
  assert.match(source, /catch \{\s*return demoCatalogFallback\(\)/);
});
