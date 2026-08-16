import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("storefront exposes the About entry and AMap-backed contact page", async () => {
  const [header, aboutPage, mapComponent] = await Promise.all([
    readFile(new URL("components/site-header.tsx", root), "utf8"),
    readFile(new URL("app/about/page.tsx", root), "utf8"),
    readFile(new URL("components/amap-location.tsx", root), "utf8"),
  ]);

  assert.match(header, /href="\/about"/);
  assert.match(aboutPage, /关于玄序/);
  assert.match(aboutPage, /NEXT_PUBLIC_AMAP_KEY/);
  assert.match(mapComponent, /_AMapSecurityConfig/);
  assert.match(mapComponent, /serviceHost/);
  assert.doesNotMatch(mapComponent, /securityJsCode/);
});
