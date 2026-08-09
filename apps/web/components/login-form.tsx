"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";

type Mode = "customer" | "register" | "admin";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("customer");
  const [identifier, setIdentifier] = useState("13800138000");
  const [password, setPassword] = useState("demo1234");
  const [smsCode, setSmsCode] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    if (next === "admin") {
      setIdentifier("admin");
      setPassword("admin123!");
    } else {
      setIdentifier("13800138000");
      setPassword("demo1234");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({ phone: identifier, password, sms_code: smsCode }),
        });
      } else {
        await apiRequest(mode === "admin" ? "/admin/auth/login" : "/auth/login", {
          method: "POST",
          body: JSON.stringify(mode === "admin" ? { username: identifier, password } : { phone: identifier, password }),
        });
      }
      router.push(mode === "admin" ? "/admin" : (search.get("next") ?? "/"));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-tabs" role="tablist" aria-label="登录类型">
        <button className={mode === "customer" ? "active" : ""} onClick={() => changeMode("customer")}>客户登录</button>
        <button className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>客户注册</button>
        <button className={mode === "admin" ? "active" : ""} onClick={() => changeMode("admin")}>后台登录</button>
      </div>
      <form onSubmit={submit}>
        <label>
          {mode === "admin" ? "管理员用户名" : "手机号"}
          <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required />
        </label>
        {mode === "register" && (
          <label>
            短信验证码
            <input value={smsCode} onChange={(event) => setSmsCode(event.target.value)} inputMode="numeric" required />
            <small>开发环境验证码：123456</small>
          </label>
        )}
        <label>
          密码
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary" disabled={loading}>
          {loading ? "处理中…" : mode === "register" ? "注册并登录" : "登录"}
        </button>
      </form>
      <p className="dev-hint">已预填开发账号，启动完整项目后可直接登录体验。</p>
    </section>
  );
}
