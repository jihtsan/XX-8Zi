"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function AdminLoginForm() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.replace("/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "后台登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <form onSubmit={submit}>
        <label>
          管理员用户名
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" disabled={loading}>
          {loading ? "登录中…" : "登录后台"}
        </button>
      </form>
      <p className="dev-hint">已预填开发管理员账号。</p>
    </section>
  );
}
