import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "玄序 · 矿物与珠串档案",
  description: "水晶手串、佛珠与天然饰品的数字档案商城。",
  openGraph: {
    title: "玄序 · 矿物与珠串档案",
    description: "水晶手串、佛珠与天然饰品的数字档案商城。",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "玄序矿物与珠串档案" }],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "玄序 · 矿物与珠串档案",
    description: "水晶手串、佛珠与天然饰品的数字档案商城。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <MotionProvider>
          <SiteHeader />
          {children}
          <footer className="site-footer shell">
            <div>
              <strong>玄序 XUANXU</strong>
              <p>矿物与珠串数字档案</p>
            </div>
            <p className="mono-note">PRIVATE TRANSACTION / WECHAT CONTACT</p>
            <p>参考价仅供浏览，最终价格、付款与交付方式以私聊确认为准。</p>
          </footer>
        </MotionProvider>
      </body>
    </html>
  );
}
