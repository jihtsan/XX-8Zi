import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../../..", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, projectRoot), "utf8");
}

test("local browser and API defaults use the same loopback site", async () => {
  const [apiClient, nextConfig, envExample, startScript, windowsStartScript] = await Promise.all([
    read("apps/web/lib/api.ts"),
    read("apps/web/next.config.ts"),
    read("apps/web/.env.example"),
    read("start.sh"),
    read("start.bat"),
  ]);

  assert.match(apiClient, /http:\/\/localhost:8000\/api\/v1/);
  assert.match(nextConfig, /http:\/\/localhost:8000\/api\/v1/);
  assert.match(envExample, /^NEXT_PUBLIC_API_URL=http:\/\/localhost:8000\/api\/v1$/m);
  assert.match(envExample, /^NEXT_PUBLIC_SITE_URL=http:\/\/localhost:3000$/m);
  assert.match(startScript, /NEXT_PUBLIC_API_URL:-http:\/\/localhost:8000\/api\/v1/);
  assert.match(windowsStartScript, /NEXT_PUBLIC_API_URL=http:\/\/localhost:8000\/api\/v1/);
});
