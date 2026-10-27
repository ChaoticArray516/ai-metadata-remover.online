# CLAUDE.md · AI Metadata Remover 工程入口（编码代理必读）

> 本文件是 Kimi Code 在本 workspace 内的**铁律第 0 条**：任何任务先读本文件，再读执行包指定的权威文档。
> 项目：**AI Metadata Remover**（`https://ai-metadata-remover.online/`），AI 元数据/AI 标签清洗工具站，英文站，单人 SEO 站长。
> 技术栈：**Astro 全站 SSG（`output: 'static'`）+ Cloudflare Pages 纯静态 + 独立 VPS（3c 才启用）**；工具岛 = **原生 TypeScript + `<script type="module">`**，**无前端框架**。

## 权威文档表（冲突时按此顺序裁决）

| 顺序 | 文档 | 路径（相对 `projs/metadata_remover/`） |
|---|---|---|
| 1 | 渲染规范（含 M4~M9 修补） | `prompts/dev_piplines/phase2/rendering_spec_v1.md` |
| 2 | SEO 技术规范（含 M1~M3 修补） | `prompts/dev_piplines/phase2/seo_tech_spec.md` |
| 3 | **3a 施工单权威导读（版本裁定 + F24~F35 注记）** | `prompts/dev_piplines/phase3/3a_func_extend.md` |
| 4 | 3a 施工单正文（三份原件，按导读的版本裁定取用） | `prompts/dev_piplines/phase3/p3_r04_batch_00/01/02.md` |
| 5 | **UI/UX 设计系统与三页规格（v1.0，权威序在施工单之下、设计图之上）** | `prompts/dev_piplines/ui_design/uiux/uiux_design_system.md` + `uiux_page_home.md`、`uiux_page_photo.md`、`uiux_page_pricing.md` |
| 6 | 执行包（九段式） | `prompts/chat/chat_task_00.md` |
| 7 | handoff（背景参考，不作执行依据） | `prompts/dev_piplines/phase0/p0_handoff/p0_handoff.md`、`phase1/p1_handoff.md` |
| 8 | 总控单 | `prompts/dev_piplines/MASTER_SOP.md` |

**规范 > 施工单 > uiux 设计系统与三页规格 > handoff**。发现文档间冲突：**停下来在执行包汇报里提出，不得自行取舍**。**颜色唯一基线 = 现行 `src/styles/tokens.css`（主蓝 #1F5EFF）**；ui_graph 设计稿与 icon README 的取色（#2563EB 等）仅作示意，不得据此改 Token。

## 硬性规则（违反即任务失败）

1. **只建三个路由**：`/`、`/remove-metadata-from-photo/`、`/pricing/`。其余一律注释占位并带批次号；`dist` 中未上线路由字符串 0 次出现。
2. **零框架、零禁包**：不引 Preact/React/Vue；`package.json` 禁止出现 `@ffmpeg/ffmpeg`、`@uswriting/exiftool`、`mupdf`、`ghostscript`、`libheif-js`、`pdf-lib`、`mediabunny`、`mp4box`、`c2pa`、`@contentauth/*`；`exifr` 仅 full 且唯一 import 点在 `src/lib/inspect/full.ts`。
3. **懒加载触发点写死**：剥段器+XMP = **首次有效文件选定（change 校验通过后）** `await import()`，模块级 Promise 缓存；exifr full = **点击"查看完整字段清单"时**；首屏不得出现 strip/exifr/report chunk。
4. **静态直出**：Title/H1/首段/FAQ/JSON-LD 全部构建期生成；**禁 `document.title` / 客户端改 canonical、meta**；禁整页 `client:load`。
5. **隐私红线**：图片清洗全流程**零出站**（含 sendBeacon/fetch/img/font/iframe）；埋点属性走白名单，**字段值、原始文件名、邮箱一律丢弃**。
6. **逐字定稿不得改写**：Title/Meta/H1/FAQ/报告文案/免责声明/对比表，一律从施工单与文案资产取字；**不得凭"更好的写法"改动**。FAQ 可见文本与 JSON-LD **同一数组同一次 map 渲染**。
7. **Schema 三红线**：无 `aggregateRating` / `HowTo` / `SearchAction`；@id 分页唯一、尾斜杠；`#org`/`#site` 只在首页定义；**首页不输出 BreadcrumbList**；**定价页仅 Free $0 单 Offer**（Pro 价格只写正文）。
8. **合规禁词**（grep 命中即失败）：`undetectable` / `bypass` / `beat detection` / `100% safe` / `guaranteed` / `100% clean` / `completely removed` / `SB 1000` / 未确认前的 `30 minutes`；**报告标题与结论句不得含 C2PA / Content Credentials**；featureList 不得出现任何"C2PA 删除"变体。
9. **C2PA 删但不宣传**：剥段器物理删除 JPEG APP11（JUMBF），但标题/首段/卖点区/报告标题与结论句一律不提；只在报告清单与 FAQ 如实列出。
10. **密度按新口径（M1）**：主词短语 4~8 次 + 词族覆盖 ≥8 段（每个 H2 段落内 `metadata` 与 `remov` 同句），**不执行 3~5% 字面值**。
11. **3a 无服务端、无支付**：不加 Pages Function、不接 Stripe；`Lock my price` = waitlist；**任何 `track('checkout_*')` 调用都是 P0 违规**。
12. **不主动标 MASTER_SOP 的 [X]**，不偷建路由、不偷装依赖、不扩大任务范围；完成后按执行包模板汇报，等督察复核。

## 工程要点速查

- `astro.config.mjs`：`site = https://ai-metadata-remover.online`、`trailingSlash: 'always'`、`build.format: 'directory'`、`compressHTML: true`、图片 service 关闭。
- `public/_headers`：CSP 含 `connect-src 'self'`（零出站保险），`camera=(self)` 仅为 capture 保留；`_astro/*` 长缓存 immutable。
- `public/sitemap.xml` 手写静态 3 条（lastmod=BUILD_TIME）；`public/robots.txt` 指向它。
- 素材 `og/logo-512.png`、`og.png`、`favicon.svg` **占位图不得上线**（F35，缺口在 MASTER_SOP §11）。
- 机检脚本在 `scripts/`（不入包）：check-keywords / check-schema / check-budget / check-forbidden / check-links / check-faq，全绿才可部署。
