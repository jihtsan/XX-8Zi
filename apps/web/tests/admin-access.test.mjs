import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin page requires the separate admin session before rendering", async () => {
  const source = await readFile(
    new URL("../app/admin/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /cookies\(\)/);
  assert.match(source, /cookieStore\.has\("admin_session"\)/);
  assert.match(source, /redirect\("\/admin\/login"\)/);
});

test("admin login uses a dedicated route and form", async () => {
  const source = await readFile(
    new URL("../app/admin/login/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /<AdminLoginForm\s*\/>/);
});
