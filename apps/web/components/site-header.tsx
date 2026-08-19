"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { maskCustomerPhone } from "@/lib/identity";

type CustomerIdentity = {
  id: number;
  phone: string;
  active: boolean;
};

export function SiteHeader() {
  const pathname = usePathname();
  const [customer, setCustomer] = useState<CustomerIdentity | null>();

  useEffect(() => {
    let current = true;
    apiRequest<CustomerIdentity>("/auth/me")
      .then((identity) => {
        if (current) setCustomer(identity);
      })
      .catch(() => {
        if (current) setCustomer(null);
      });
    return () => {
      current = false;
    };
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="玄序首页">
          <span className="brand-mark" aria-hidden="true">
            <Image
              src="/brand-mineral-mark.png"
              alt=""
              width={56}
              height={56}
              priority
            />
          </span>
          <span>玄序</span>
          <small>XUANXU ARCHIVE</small>
        </Link>
        <nav aria-label="主导航">
          <Link href="/#catalog">商品档案</Link>
          <Link href="/about">关于我们</Link>
          <Link href="/account/orders">我的订单</Link>
        </nav>
        {customer === undefined ? (
          <span
            className="header-login header-login-loading"
            aria-label="正在确认登录状态"
          >
            账户
          </span>
        ) : customer ? (
          <Link
            className="header-login"
            href="/account/orders"
            aria-label="已登录，进入我的订单"
          >
            客户 · {maskCustomerPhone(customer.phone)}
          </Link>
        ) : (
          <Link className="header-login" href="/login">
            登录 / 注册
          </Link>
        )}
      </div>
    </header>
  );
}
