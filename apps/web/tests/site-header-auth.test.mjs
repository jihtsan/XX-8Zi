import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("site header resolves and displays the customer session", async () => {
  const source = await readFile(
    new URL("../components/site-header.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /^"use client";/);
  assert.match(source, /apiRequest<CustomerIdentity>\("\/auth\/me"\)/);
  assert.match(source, /usePathname\(\)/);
  assert.match(source, /maskCustomerPhone\(customer\.phone\)/);
  assert.doesNotMatch(source, /href=["']\/admin["']/);
});

test("customer phone is masked before it reaches the header", async () => {
  const { maskCustomerPhone } = await import("../lib/identity.ts");

  assert.equal(maskCustomerPhone("13800138000"), "138****8000");
  assert.equal(maskCustomerPhone("1234567"), "1234567");
});
