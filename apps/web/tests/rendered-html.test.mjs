import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished storefront", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>玄序 · 矿物与珠串档案<\/title>/i);
  assert.match(html, /每一串/);
  assert.match(html, /brand-mineral-mark\.png/);
  assert.match(html, /六颗天然材质珠子的旋转轨道装饰/);
  assert.match(html, /MINERAL SIGNAL \/ 06/);
  assert.equal(html.match(/mineral-fallback-bead/g)?.length, 6);
  assert.match(html, /紫晶轨道/);
  assert.match(html, /立即购买|浏览档案/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/);
});
