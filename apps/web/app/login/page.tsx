import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <main className="auth-page shell">
      <section className="auth-intro">
        <p className="eyebrow">IDENTITY / ACCESS</p>
        <h1>进入你的档案</h1>
        <p>登录后可以立即购买、查看订单，并在待确认阶段取消订单。</p>
      </section>
      <LoginForm />
    </main>
  );
}
