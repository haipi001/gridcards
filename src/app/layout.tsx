import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import TopNav from "@/components/TopNav";
import SearchPalette from "@/components/SearchPalette";
import SellButton from "@/components/SellButton";
import WatchlistLink from "@/components/WatchlistLink";
import ThemeToggle, { THEME_BOOTSTRAP } from "@/components/ThemeToggle";
import SiteFooter from "@/components/SiteFooter";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/market/Toast";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, pageMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMeta({
    title: `${SITE_NAME} — ${"F1 Card Marketplace"}`,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — F1 卡谱市场`,
    template: `%s · ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  keywords: [
    "F1 卡牌",
    "Topps Chrome F1",
    "2020 Topps Chrome Formula 1",
    "赛车卡",
    "卡谱",
    "checklist",
    "SuperFractor",
    "trading cards",
  ],
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The chrome switches with data-theme; tell the browser UI about both so the
  // address bar never clashes with the page.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07090b" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <body>
        {/* Resolve the stored (or OS) theme before the first paint, otherwise a
            light-mode visitor sees a dark flash on every navigation. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {/* First tab stop: keyboard users must be able to jump past the chrome. */}
        <a className="skipLink" href="#main">
          跳到主要内容
        </a>
        {/* Honesty bar: this build ships DEMO pricing and frozen trading. */}
        <div className="demoStrip" role="note">
          <span className="demoStripTag">DEMO</span>
          <span className="demoStripText">
            原型站点 · 卡谱结构来自 2020 Topps Chrome F1 官方 checklist，价格 / 成交为演示数据 · 交易功能已冻结
          </span>
          <Link className="demoStripLink" href="/legal/">
            数据与版权说明
          </Link>
        </div>
        <header className="topbar">
          <Link className="brand" href="/">
            <i className="mark"></i>
            <span>
              GRID<em>CARDS</em>
            </span>
          </Link>
          <TopNav />
          <SearchPalette />
          <div className="topRight">
            <SellButton />
            <WatchlistLink />
            <ThemeToggle />
            <Link className="avatarBtn" href="/profile/" aria-label="My Space"></Link>
          </div>
        </header>
        {/* One toast host for the whole app. Community and Profile need it just
            as much as the market does, and a second host would only ever be
            empty — so it lives here instead of inside the market shell. */}
        <ToastProvider>
          <main id="main" tabIndex={-1}>
            {children}
          </main>
        </ToastProvider>
        <SiteFooter />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
