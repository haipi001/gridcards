# GRIDCARDS

F1 卡牌交易市场的**静态导出前端**：Next.js App Router + `output: "export"`，全部路由在构建期预渲染成 `out/`，可以丢到任何静态托管上。

卡谱结构来自 2020 Topps Chrome Formula 1 官方 checklist（313 条记录 / 57 位车手），
**价格、成交额、榜单与余额全部是 DEMO 数据**，交易按钮默认冻结。这是全站唯一的硬性规则。

```bash
npm install
npm run dev          # http://localhost:3000
```

交易板块入口：<http://localhost:3000/market/>

---

## 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（含 mock 延迟，`?trade=1` / `?fail=1` 可用） |
| `npm run verify` | 数据自检：43 项不变量（id 唯一、金额为整数分、卡号是字符串、一卡一挂单 …） |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run mock:gen` | 重新生成 `public/mock/*.json` 与 `src/market/generated/ids.ts` |
| `npm run build` | 先跑 `verify`，再导出静态站点到 `out/` |

`npm run build` 之前会自动执行 `npm run verify`——生成器出问题会在发布前挡住，而不是变成 300 个坏页面。

## 目录

```
src/app/            路由（静态导出，含 sitemap.ts / robots.ts / manifest.ts / icon.svg）
  market/           交易市场板块：首页推荐 · 合集 · 商品 · 我的资产 · 搜索
  players/[name]/   车手 → 版本 → 编号槽位（官方印量决定槽位数）
  sell/ my-copies/  上传建卡（canvas 重编码剥离 EXIF）→ 挂单
  legal/ notices/ takedown/   数据说明 · 第三方署名 · 下架请求
src/market/         市场数据层：types · api · query · actions · ledger · rarity · format
src/components/     UI（market/ 为市场组件，card-effects/ 为 WebGL 卡面）
src/lib/            catalog · archiveData · storage(adapter) · upload · seo · mockStatic
public/mock/        生成的市场数据（结构贴近真实 REST 接口）
public/img/         卡面影像（archive 扫描图 + 自绘车队标识）
data/               官方 checklist 与 1/1 档案原始数据
scripts/            生成器、自检、vendor 脚本
```

## 数据与接口的三个接缝

整个市场只读 6 个资源，换真实后端只动三处，页面代码零改动：

1. `src/market/config.ts` — `API_BASE`：留空用 `/mock`，设 `NEXT_PUBLIC_MARKET_API` 指向真实服务。
2. `src/market/api.ts` — 6 个 `load*` 函数改成 HTTP 请求（`fetchQuery` 替代 `fetchFile`）。
3. `src/market/actions.ts` — 写入动作改真实接口，保留 `ActionResult` 契约。

类型契约见 `src/market/types.ts`。详见 [docs/MARKET.md](docs/MARKET.md)。

## 上线前必须设置

```bash
cp .env.example .env.local   # 或直接配到托管平台的构建环境变量
```

**`NEXT_PUBLIC_SITE_URL`** 是唯一必填项：canonical、Open Graph 与 `sitemap.xml` 里的绝对地址都在构建期烘焙进去，
不设置会把 `https://gridcards.example.com` 写给爬虫。

`?trade=1` / `?fail=1` 只在 `next dev` 和显式设置 `NEXT_PUBLIC_DEV_SWITCHES=1` 的构建里生效。
生产站点上访客无法通过改 URL 把冻结的市场变成"可交易"的样子。

## 部署

`out/` 是纯静态产物，任何静态托管均可。三种主流平台的配置已内置：

- `public/_headers` — Cloudflare Pages / Netlify 风格的安全头与缓存策略
- `vercel.json` — Vercel（框架识别 Next.js，安全头 + 缓存）
- `netlify.toml` — Netlify（构建命令、`out/`、安全头、404 回退）

完整步骤、缓存与 404 行为、上线后检查清单见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 已知限制

- **没有服务端**：账户、支付、托管、履约都不存在，交易状态机只在本机演示。
- **行情是 DEMO**：种子固定的生成数据，不是真实成交，不能用于估值。
- **上传仅本机**：照片存 IndexedDB，换浏览器/清缓存即消失；接对象存储需替换 `src/lib/storage/` 的 adapter。
- **影像为第三方投稿**：权利状态见 `/notices/`，权利人可走 `/takedown/`。
- 站点为原型演示，未获得 F1 / Topps / PSA 等权利人的授权。

法律与数据说明：<http://localhost:3000/legal/>
