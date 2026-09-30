# 部署

`out/` 是纯静态产物（`output: "export"` + `trailingSlash: true`），任何静态托管都能跑。
本文档覆盖：构建变量 → 三个平台的落地步骤 → 缓存与安全头 → 404 → 上线后检查清单。

## 1 · 构建

```bash
npm ci
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build
```

产物在 `out/`，约 130 MB（其中 `public/img/` 18 MB 卡面影像 + 300+ 预渲染页面）。
构建会自动先跑 `npm run verify`；也可以在 CI 里单独跑（见 `.github/workflows/ci.yml`）。

### 构建期环境变量

变量在**构建时**烘焙进产物，改值必须重新构建。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | ✅ | 绝对 origin（不带尾斜杠）。写进 canonical / OG / `sitemap.xml`。 |
| `NEXT_PUBLIC_MARKET_API` | — | 指向真实后端；留空则发 `/mock/*.json`。 |
| `NEXT_PUBLIC_MOCK_LATENCY` | — | mock 读取延迟 ms（默认：生产 150 / 开发 260；接真实 API 时为 0）。 |
| `NEXT_PUBLIC_DEV_SWITCHES` | — | 设为 `1` 才允许生产构建里的 `?trade=1` / `?fail=1`。演示/评审构建专用。 |

## 2 · 平台

### Cloudflare Pages

- Build command：`npm run build`
- Build output directory：`out`
- Node version：22（在环境变量里加 `NODE_VERSION = 22`）
- 环境变量：`NEXT_PUBLIC_SITE_URL`（必填）
- 安全头与缓存：仓库内的 `public/_headers` 会被自动应用

### Vercel

- 框架自动识别为 Next.js；`vercel.json` 提供安全头与缓存规则
- Project Settings → Environment Variables 里加 `NEXT_PUBLIC_SITE_URL`
- 因为静态导出不走 Vercel 的 Next 运行时，需要把 `vercel.json` 的 `framework` 保留为 `nextjs`，
  输出目录由 Vercel 从 `output: "export"` 推断；若部署异常，改用 `Build Command: npm run build` +
  `Output Directory: out`

### Netlify

- 仓库内 `netlify.toml` 已写好：`command = "npm run build"`、`publish = "out"`、`NODE_VERSION = 22`
- Site configuration → Environment variables 里加 `NEXT_PUBLIC_SITE_URL`

### GitHub Pages / 任意对象存储

```bash
npm run build
# 把 out/ 整个目录上传
```

GitHub Pages 不读 `_headers`，安全头会丢失（不影响运行，只是少了加固层）。
若用自定义域名，注意 `CNAME` 文件需要手动放进 `out/`。

## 3 · 缓存策略

三类资源的生命周期完全不同，三份配置保持同步：

| 路径 | 策略 | 理由 |
| --- | --- | --- |
| `/_next/static/*` | `max-age=31536000, immutable` | 文件名带 hash |
| `/img/*` | `max-age=31536000, immutable` | 文件名即内容地址 |
| `/mock/*` | `max-age=300, must-revalidate` | 由 `npm run mock:gen` 重新生成 |
| 其他（HTML） | `max-age=0, must-revalidate` | 让一次部署立刻可见 |

## 4 · 404

构建会导出 `out/404.html`。Cloudflare Pages、Netlify 与 Vercel 都会对未匹配路径自动回退到它
（Netlify 另外在 `netlify.toml` 里显式声明了 `/* → /404.html` 的 404 重定向）。

动态路由（商品 / 系列 / 车手 / 版本）都设了 `generateStaticParams` + `dynamicParams = false`：
checklist 之外的参数不会生成页面，未收录的 URL 直接 404，不会渲染出空壳页面。

## 5 · 安全头

`output: "export"` 下 `next.config.ts` 的 `headers()` 不生效（它只对 `next dev` / `next start` 有效），
所以同一份策略分别写在 `public/_headers`、`vercel.json`、`netlify.toml`：

- CSP：`default-src 'self'`；`script-src`/`style-src` 额外允许 `'unsafe-inline'`（静态导出没有 nonce 机制，
  Next 的内联引导脚本与内联样式必须放行）
- `X-Content-Type-Options: nosniff`、`Referrer-Policy`、`X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `upgrade-insecure-requests`

> 改 CSP 时三份文件一起改，否则某个平台会比别的平台更宽松。

## 6 · 上线后检查清单

```bash
npm run verify && npm run lint && npm run typecheck   # 本地
```

部署后逐项确认：

- [ ] `/sitemap.xml` 存在，里面的域名是真实域名（不是 `gridcards.example.com`）
- [ ] `/robots.txt` 指向正确 sitemap，且 `Disallow` 了 `/market/search/`、`/market/me/`
- [ ] `/manifest.webmanifest` 与 `/icon.svg` 200
- [ ] 任意页面 view-source 里 `<link rel="canonical">` 是真实绝对地址
- [ ] 顶部 DEMO 条可见，`/legal/` 可访问
- [ ] 商品详情页点击「买入」无副作用（冻结态，余额不变）
- [ ] 生产环境加 `?trade=1` **不会**解锁交易按钮（只有 dev / `NEXT_PUBLIC_DEV_SWITCHES=1` 才解锁）
- [ ] 移动端无横向滚动
- [ ] `/nonexistent-page/` 返回 404 页面
- [ ] Lighthouse：无 console error、无 hydration 警告
