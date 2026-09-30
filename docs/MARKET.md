# 市场板块 /market — 说明

F1 卡牌交易市场的完整前端界面。深色沉浸式基调，商品结构与呈现参考
OpenSea 合集，行情与成交体验参考 NBA Top Shot。**全部数据由 mock 驱动，
不依赖任何服务器**（站点是 `output: "export"` 静态导出）。

## 1. 启动方式

```bash
npm install
npm run mock:gen     # 生成 public/mock/*.json（已提交，改数据后需重跑）
npm run verify       # 数据自检：43 项不变量（build 前会自动跑）
npm run dev          # http://localhost:3000/market/
npm run build        # 静态导出到 out/
```

上线部署（构建变量、三平台配置、缓存与 404、上线检查清单）见
[DEPLOY.md](DEPLOY.md)。

> 沙箱/CI 里若 `next build` 报 `broker.sock` 连接失败，用
> `env -u NODE_OPTIONS npm run build`（去掉被注入的 NODE_OPTIONS shim）。

本地预览静态产物：

```bash
cd out && python3 -m http.server 3211
# http://127.0.0.1:3211/market/
```

## 2. 页面

| 路由 | 内容 |
|---|---|
| `/market/` | 首页推荐：1/1 焦点 rail、热门系列、稀有成交 tape、涨幅榜、收藏家榜单、最新动态 |
| `/market/collections/` | 合集 / 系列列表（地板价、成交额、持有人、sparkline） |
| `/market/collections/[slug]/` | 系列详情 + 该系列商品列表（筛选/排序/分页） |
| `/market/items/` | 全部商品：系列、稀有度、卡号、价格区间筛选 + 排序 + 分页 |
| `/market/items/[id]/` | 商品详情：大图与动效、属性与稀有度、当前挂单 / 求购报价、价格走势与成交历史 |
| `/market/me/` | 我的资产、挂单管理、我的出价、收到的报价、关注、余额与结算 |
| `/market/search/?q=` | 搜索结果 |

## 3. 交易冻结与演练开关

**买入 / 出售默认冻结**：按钮渲染为禁用态并带 `FROZEN` 徽标，点击不会发起
任何请求、不改动余额。冻结说明同时显示在页头 `TRADE FROZEN` 与交易面板。

开关位置：`src/market/config.ts`

```ts
export const TRADE_FROZEN_DEFAULT = true;   // 默认冻结
export const TRADE_QUERY_PARAM = "trade";   // ?trade=1 开启演练
export const DEV_SWITCHES = !IS_PROD || process.env.NEXT_PUBLIC_DEV_SWITCHES === "1";
```

**调试开关不是功能**：`?trade=1` / `?fail=1` 只在 `next dev` 与显式设置了
`NEXT_PUBLIC_DEV_SWITCHES=1` 的构建里生效。生产站点上访客无法通过改 URL 把冻结的
市场变成"可交易"的样子，冻结文案（`TRADE_HINT`）也不会宣传一个点不动的开关。

演练模式（`?trade=1`，需 DEV_SWITCHES 打开）会跑完整流程：请求延迟 → 成功 / 失败 →
余额结算 → 写入 localStorage 账本 → toast 提示。失败是**真实可达**的：

- 12% 概率的网络抖动（`actions.ts` 的 `networkFailed()`）
- 余额不足会返回 `INSUFFICIENT_FUNDS`
- 任意列表/详情页追加 `?fail=1` 可强制读取失败，用于查看错误态与重试

## 4. mock 数据

| 文件 | 内容 |
|---|---|
| `public/mock/series.json` | 7 个合集 |
| `public/mock/items.json` | 302 个可交易版本（含 26 个真实 1/1 扫描图） |
| `public/mock/listings.json` | 689 条挂单（卖家侧） |
| `public/mock/offers.json` | 249 条求购报价 |
| `public/mock/activity.json` | 1004 条市场事件（成交/挂单/出价/转移…） |
| `public/mock/me.json` | 登录用户：余额、持有卡牌、挂单、报价、关注 |
| `public/mock/spotlight.json` | 首页各 rail 的数据 |

生成脚本 `scripts/gen-market-mock.mjs`（`npm run mock:gen`）：

- **种子 PRNG（mulberry32）**，两次运行结果字节一致，静态导出不会漂移；
- 同一车手在同一合集里只生成一张卡（源 checklist 有重复条目，脚本去重并对 id 唯一性做断言）；
- **一张实体卡只能挂一次**：同一 `(itemId, serial)` 全市场只出现一条挂单，
  不会出现两个卖家同时在卖 36/50；
- 卡的真实身份（`车手 / 车队 / 卡号 / 涂装色 / 1/1 扫描图`）全部来自
  `data/2020-topps-chrome-f1.json`、`data/allofone-archive.json`、`src/lib/teams.ts`
  ——**不会凭空造一张不存在的卡**；
- 价格、成交量、榜单是 DEMO，界面上所有位置都标了 `DEMO`；
- 同时产出 `src/market/generated/ids.ts`，供 `generateStaticParams` 预渲染
  全部商品详情页与系列页（静态导出必须枚举动态路由）。

## 5. 换成真实接口的三个位置

界面只依赖 `src/market/` 这一层，替换时**页面与组件一行都不用改**。

| 位置 | 现在 | 换成真实接口 |
|---|---|---|
| `src/market/config.ts` | `API_BASE = "/mock"` | 设 `NEXT_PUBLIC_MARKET_API=https://api…/v1` |
| `src/market/api.ts` | 6 个 `load*` 读静态 JSON | 改成 `GET /series`、`GET /items?…`、`GET /items/{id}` 等；筛选/排序/分页交给服务端，`query.ts` 从读路径里移除（它仍然可以用于本地缓存排序） |
| `src/market/actions.ts` | 本地账本 + 模拟延迟/失败 | 改成 `POST /listings`、`POST /offers`、`POST /orders/buy-now` 等，保留 `ActionResult` 结构，UI 状态机不用动 |

数据形状即接口契约，见 `src/market/types.ts`：

- **卡号与编号永远是字符串**（`"1"` / `"TT-1"` / `"54W-10"`），编号显示用
  `serialLabel(serial, total)` 拼 `3/5`，不解析成数字；
- **金额永远是整数分**（`priceCents`），不出现浮点；
- 市场真相只来自 `activity`（`market_events`），不从社交帖子派生；
- 所有权只在订单 `COMPLETED` 时转移。

## 6. 目录结构

```
src/market/
  types.ts       接口契约（数据形状）
  config.ts      API_BASE / 冻结开关 / 延迟与故障注入
  api.ts         读取：只有组件能碰的 6 个入口 + 派生查询
  query.ts       筛选 / 排序 / 分页（纯函数，mock 端在浏览器执行）
  actions.ts     写入：挂单 / 撤单 / 出价 / 接受 / 买入（含冻结门禁）
  ledger.ts      localStorage 演示账本（余额、持有、挂单、报价）
  useAsync.ts    loading / ok / error + reload；useAccount 订阅账本
  rarity.ts      稀有度阶梯与配色
  format.ts      金额 / 百分比 / 时间 / 编号格式化
  generated/     预渲染 id（脚本生成）

src/components/market/
  Shell.tsx      市场页头、子导航、搜索框、toast 宿主
  Browse.tsx     商品列表（筛选 + 排序 + 分页）
  CardTile/CardArt  卡片与稀有度视觉
  Filters.tsx    筛选面板 / 排序条 / 分页器
  Tables.tsx     挂单表 / 报价表 / 成交表 / 价格走势 / 属性网格
  TradePanel.tsx 买入 / 出价 / 余额 / 结算 / 冻结说明
  ItemGallery.tsx 详情大图（1/1 走 RuiC WebGL，其余 CSS 浮动态）
  Rails.tsx      首页各 rail
  MyAssets.tsx   我的资产与挂单管理
  States.tsx     骨架 / 空状态 / 错误态
  Toast.tsx      loading → success / error 提示
```

## 7. 视觉与交互约定

- 深色沉浸：沿用 `:root` 变量（`--bg #070809` / `--s1..s3` / `--line`），
  市场样式集中在 `globals.css` 的 `S9 · MARKETPLACE` 段；
- 稀有度五级：`ULTIMATE / LEGENDARY / RARE / UNCOMMON / BASE`，颜色定义唯一
  来源 `src/market/rarity.ts`，通过 `--rarity / --rarityGlow` 传给样式；
- 涨跌配色遵循国内习惯：**涨红（`--red`）、跌绿（`--green`）**；
- 列表与网格**不初始化 WebGL**，只用 `img + CSS perspective` 悬浮动效；只有
  商品详情页的大图在有真实扫描图时才加载 RuiC 引擎（`ssr:false` 动态导入，
  无 WebGL 自动降级 CSS3D）；
- `prefers-reduced-motion` 下关闭浮动与位移动画；
- 断点：1020px（双列合并）、980px（筛选栏改为顶部）、600px（表格转两列、
  网格变密）。
