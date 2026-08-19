import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = { title: "后台登录" };

export default function AdminLoginPage() {
  return (
    <main className="auth-page shell">
      <section className="auth-intro">
        <p className="eyebrow">ADMIN / ACCESS</p>
        <h1>进入运营控制台</h1>
        <p>后台管理员使用独立账户登录。商城客户账户无法访问后台数据。</p>
      </section>
      <AdminLoginForm />
    </main>
  );
}
