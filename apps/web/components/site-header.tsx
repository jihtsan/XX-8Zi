import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="玄序首页">
          <span className="brand-mark">◇</span>
          <span>玄序</span>
          <small>XUANXU ARCHIVE</small>
        </Link>
        <nav aria-label="主导航">
          <Link href="/#catalog">商品档案</Link>
          <Link href="/account/orders">我的订单</Link>
          <Link href="/admin">管理后台</Link>
        </nav>
        <Link className="header-login" href="/login">登录 / 注册</Link>
      </div>
    </header>
  );
}
