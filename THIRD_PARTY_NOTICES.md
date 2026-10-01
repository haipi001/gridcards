# Third-party notices

GRIDCARDS 是一个 F1 交易卡市场的演示站点。本文件记录站内使用的第三方素材与代码及其许可状态。
任何权利人都可通过站内 **/takedown/** 页面提交下架或更正请求。

---

## 1. 卡面影像（1/1 Digital Archive）

- **内容**：`public/img/archive/` 下 515 张实体卡扫描图（2020–2026 赛季，9 个 Topps F1 系列）。
- **来源**：第三方公开卡片档案库（站点页面不显示该来源名称，此处为完整署名）。车队归属由 Ergast 兼容 API（api.jolpi.ca）按赛季参赛名单解析。
- **性质**：这些是**他人拍摄/提供的实物卡照片**，不是本项目的作品。
- **现状**：随站点一起分发，用于演示"真实卡面长什么样"。
- **已采取的措施**：
  - 每张卡在档案页显示来源署名与"第三方影像"标识；
  - 提供 **/takedown/** 下架通道；
  - 计划由用户自有上传（Phase 6）逐步替换。
- **风险**：卡面 artwork、球队标识、车手形象可能各自拥有独立的著作权/商标/数据库权利。软件的开源许可**不授予**对这些素材的任何权利。正式上线前应当替换为已获授权的目录图或用户自有上传。
- **使用范围**：315 张扫描图中，210 张市场版本 + 179 条清单记录实际取用（`scripts/lib/cardImages.mjs` 统一分配）。其余仍按需闲置。

## 1b. 车手 / 车队 / 赛车照片（Wikimedia Commons）

- **内容**：`public/img/cards/` 下的照片，用于档案库从未拍摄过的主体（2020 赛季的后段车手、领队、10 支车队、3 台赛车，共 30 个主体 / 92 个市场版本）。
- **来源**：Wikimedia Commons。`data/image-manifest.json` 记录每个主体的搜索词，抓取脚本把实际命中的 **许可协议、作者、来源页面 URL** 一并回写。
- **许可**：脚本只接受 **CC0 / CC BY / CC BY-SA / 公有领域**；其余一律跳过。
- **抓取**：`node scripts/fetch-card-images.mjs`（可断点续跑，每完成一个主体即写回清单）。抓取后重跑 `npm run mock:gen` 与 `node scripts/gen-catalog-images.mjs` 即可接上。
- **注意**：这类照片是**主体形象照，不是卡片照片**，仅用于填补档案库完全没有的主体。档案库有真实卡照时一律优先使用卡照。

## 2. 车队标识（已替换为自绘）

- **曾使用**：10 支车队的标识 PNG，镜像自开源仓库 `slowlydev/f1-dash`。该仓库以 **AGPL** 许可发布，且标识本身涉及车队商标。
- **现状**：**已全部移除**。`public/img/teams/` 下的 `.svg` 是本项目用 `scripts/gen-team-marks.ts` 按车队涂装配色生成的**抽象几何标识**，不复制任何厂商 artwork。
- **理由**：AGPL 的传染性义务与商标风险都不适合一个静态演示站；自绘标识可完全规避。

## 3. RuiC-card-skill（卡面立体效果引擎 · MIT）

- **上游**：https://github.com/HRuiCcc/RuiC-card-skill
- **许可**：MIT License · **Copyright (c) 2026 HRuiCcc**
- **状态**：**已 vendor**。`vendor/ruic-card-skill/` 保留上游 `LICENSE`、`SKILL.md` 与
  `assets/web-template/app.js`（shader 的出处文件）；二进制演示素材（mp4/gif）未引入。
- **衍生代码**：
  - `src/components/card-effects/ruicShaders.ts` —— 由上游 `app.js` 抽取的 foil 片元/顶点着色器，
    文件头标注上游出处与两处改写（three.js 注入变量改为显式声明；`pow(col,2.2)` +
    `<colorspace_fragment>` 相互抵消，故直接输出 sRGB）。
  - `src/components/card-effects/RuicRenderer.ts` —— **本项目自写**的原生 WebGL 渲染器，
    不引入 three.js，不使用上游的 GLB/Blender 管线；只复用了上面的 shader 与 finish 取值规则。
- **未使用**：上游的 Blender 脚本、`app.bundle.js`（内联 three + 自带 UI）、GLB 模型。
- **约束**：不得暗示 RuiC 上游拥有或许可用户上传的卡图；用户上传内容绝不进 Git（存 IndexedDB）。
- 上游许可同时声明：其生成的作品与用户上传的参考图不随该仓库分发，也不受该软件许可覆盖。

## 4. 官方卡表数据（2020 Topps Chrome F1）

- **内容**：`data/2020-topps-chrome-f1.json` / `src/data/catalog.json` —— 313 条官方 checklist 记录（卡号、人物/对象名、车队、分区结构）。
- **用途**：仅作为结构性数据（卡号层级、稀有度阶梯的骨架）。
- **说明**：价格、成交额、指数、流动性分数等数值**均为演示占位值**，在任何页面都带有 `DEMO` 标注，不是现实市场报价。卡表数据可能受数据库权利保护，正式商用需单独授权。

## 5. 商标

F1、Formula 1、Topps、PSA、McLaren 等名称与标识为各自权利人的商标。本站点仅为演示，不主张任何权利，也未获得任何授权。

---

## 合规清单（每期收尾检查）

- [x] 第三方车队标识（AGPL 来源）已移除，改为自绘
- [x] 用户上传目录 `public/img/uploads/` 已在 `.gitignore` 中排除
- [x] RuiC 已 vendor：LICENSE 保留、衍生 shader 标注出处、本文件署名
- [x] `public/img/cards/` 下每张照片在 `data/image-manifest.json` 中留有许可与作者，由 `npm run verify` 强制校验
- [ ] 卡面影像逐张可见来源署名（进行中）
- [ ] 下架请求写入数据表并留痕（Phase 12）
- [ ] 正式上线前：卡面影像替换为已授权素材或用户自有上传
