# 项目技术栈与风险清单

## 1. 项目定位

本仓库是一个基于 Web 的机房数字孪生场景编辑与展示项目，采用 `npm workspaces` 管理两个应用：

- `apps/twin-web`：前端主应用，负责场景编排、三维总览、设备详情展示
- `apps/mock-api`：本地 Mock API，负责设备目录、命名场景、当前场景与 runtime 数据的读取和保存

当前落地状态更接近“场景主链路和 runtime 闭环已稳定，资产中心基础版已经接入，下一步进入性能收敛与更真实交付边界补齐”的形态。

## 2. 当前技术栈

### 2.1 仓库与工程组织

- 包管理：`npm`
- Monorepo：`npm workspaces`
- 代码语言：`TypeScript`
- 模块制式：ESM

### 2.2 前端 `apps/twin-web`

- 前端框架：`React 19`
- 构建工具：`Vite 8`
- 路由：`react-router-dom 7`
- 三维渲染：`three` + `@react-three/fiber` + `@react-three/drei`
- 状态管理：`zustand`
- 数据校验：`zod`
- 图表：`echarts`
- 代码规范：`eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`

### 2.3 后端 `apps/mock-api`

- Web 框架：`Express 5`
- 运行方式：Node.js + `--experimental-strip-types`（开发态）
- 数据存储：
  - 场景仍以本地 JSON 为主
  - 资产中心使用 SQLite-backed repository layer
  - 模型文件通过本地对象存储适配层落盘
- 接口职责：
  - `/api/scene`：读取、保存、重置当前场景
  - `/api/assets/*`：资产 CRUD、连接点/绑定配置、模型上传、发布历史
  - `/api/equipment/catalog`：设备目录
  - `/api/equipment/:assetId`：设备资产描述
  - `/api/equipment/:assetId/ports`：端口描述

### 2.4 资源与数据形态

- 三维模型格式：`GLB`
- 场景数据：`scene.json`
- 资产主信息/连接点/绑定/版本：SQLite-backed tables
- 模型文件：本地对象存储适配层（后续可替换 OSS）
- 前端运行态数据：通过 `mock-api` 的 runtime 接口拉取，overview/detail 使用固定轮询

## 3. 关键模块

### 3.1 前端核心模块

- 路由入口：`apps/twin-web/src/App.tsx`
- 场景状态中心：`apps/twin-web/src/store/sceneStore.ts`
- 编辑器 UI 状态：`apps/twin-web/src/store/editorUiStore.ts`
- 编排页：`apps/twin-web/src/pages/editor/EditorPage.tsx`
- 场景管理页：`apps/twin-web/src/pages/scenes/ScenesPage.tsx`
- 场景总览页：`apps/twin-web/src/pages/overview/OverviewPage.tsx`
- 场景预览页：`apps/twin-web/src/pages/scenes/ScenePreviewPage.tsx`
- 详情页：`apps/twin-web/src/pages/detail/DeviceDetailPage.tsx`
- 场景 API：`apps/twin-web/src/services/api/sceneApi.ts`
- 设备 API：`apps/twin-web/src/services/api/equipmentApi.ts`
- 资产 API：`apps/twin-web/src/services/api/assetsApi.ts`
- 设备目录加载：`apps/twin-web/src/services/loadEquipmentCatalog.ts`
- 正交布线：`apps/twin-web/src/services/orthogonalRoute.ts`
- 碰撞检测：`apps/twin-web/src/services/pipeCollision.ts`

### 3.2 后端核心模块

- 应用入口：`apps/mock-api/src/app.ts`
- 资产路由：`apps/mock-api/src/routes/assets.ts`
- 场景路由：`apps/mock-api/src/routes/scene.ts`
- 设备路由：`apps/mock-api/src/routes/equipment.ts`
- 资产仓储：`apps/mock-api/src/lib/assetStore.ts`
- 存储适配层：`apps/mock-api/src/lib/storageAdapter.ts`
- 文件读写：`apps/mock-api/src/lib/fileStore.ts`

## 4. 当前已验证状态

2026-04-08 fresh verification:

- `npm test -w twin-web`：通过，`16` 个测试全部通过
- `npm test -w mock-api`：通过，`19` 个测试全部通过
- `npm run lint -w twin-web`：通过
- `npm run build`：通过
- `npm run build:api`：通过
- `npm run check`：未重新跑整仓，但组成命令已分别通过

当前质量门禁状态：

- 仓库根级已提供 `lint`、`test`、`check` 聚合脚本
- 已新增 GitHub Actions CI，执行与本地一致的 `npm run check`
- 前端已补齐页面级 runtime 集成测试，覆盖 `/overview` 与 `/detail/:deviceId` 的 runtime 接线
- 前端已补齐场景管理与预览页测试，覆盖 `/scenes` 列表/创建和 `/scenes/:sceneId/preview` 只读预览入口
- 前端已补齐 sceneStore 撤销测试，并将总览入口改成 `/scenes/:sceneId/overview`
- 前端已补齐 `/assets` 管理页测试，覆盖资产列表、创建、编辑、连接点语义保存、发布/下线/删除与模型上传面板
- 后端已补齐资产管理 API/仓储测试，覆盖草稿创建、连接点语义持久化、兼容投影、文件上传、发布投影和设备目录回读

当前前端构建仍有明显体积压力：

- `three.module` chunk 约 `716 KB`
- `charts-vendor` chunk 约 `489 KB`
- `loadEquipmentCatalog` chunk 约 `383 KB`

说明项目已具备基本工程门禁，但性能和边界收敛仍然是下一阶段重点。

## 5. 风险清单

### P0 高优先级风险

#### 1. 前端包体仍偏大，3D 与图表扩容存在性能风险

- 现状：构建已无失败，但 `three` 与图表相关 chunk 仍然偏重
- 影响：首屏加载、总览页切换、大屏场景加载会继续受体积拖累
- 建议：
  - 继续拆分重型模块
  - 在引入更多真实 GLB 前先做 bundle 分析
  - 把共享 store 与大依赖的耦合继续压低

#### 2. 资产中心已经成为主链路，但旧 JSON 种子仍存在历史包袱

- 现状：
  - 运行时资产真相源已迁到 `assetStore` 的 SQLite-backed tables
  - `apps/mock-api/data/equipment/**` 仍作为冷启动种子输入保留
- 影响：如果继续手工维护旧 JSON，可能对冷启动导入造成误解
- 建议：
  - 明确标注旧目录仅用于 demo seed
  - 下一步补独立 bootstrap/import 脚本，把历史 JSON 完全退出运行链路

#### 3. 场景优先入口已经成形，还缺更完整的端到端视角

- 现状：已有 API/store、场景管理页与预览页测试，但还没有浏览器级 E2E
- 影响：路由、真实 canvas、浏览器交互链路仍可能存在未覆盖回归
- 建议：
  - 下一步补最小浏览器级 smoke 测试
  - 优先覆盖“场景管理进入总览/编辑”和“编排页保存/撤销”两条主链路

### P1 中优先级风险

#### 4. 场景仍是单机文件写入，资产与场景的持久化模型还不统一

- 现状：
  - 资产已进入 SQLite-backed repository layer
  - 场景仍直接读写 `current.scene.json` 和命名场景文件
- 影响：场景版本、审计和并发能力仍弱于资产中心
- 建议：
  - 下一步逐步把场景也迁到数据库或版本化仓储
  - 至少先补场景版本留痕和发布记录

#### 5. 自动布线还是 MVP 级别，复杂场景下会很快碰到上限

- 现状：当前是正交路径 + 碰撞检测，复杂避障还没做
- 影响：设备数量一上来，手工修线成本会明显增加
- 建议：
  - 短期保持“MVP + 冲突高亮”
  - 中期补手工节点编辑，再评估自动避障

#### 6. runtime 合同已建立，但 detail 文案仍是前端默认值

- 现状：运行模式、策略说明、AI 建议仍由前端默认文案注入
- 影响：接真实后端时需要再次收敛 detail 数据边界
- 建议：
  - 保持当前合同稳定
  - 下一个版本再决定这些字段是否后端化

### P2 低优先级风险

#### 7. 编辑器能力仍偏 MVP，常用生产能力还在补齐

- 现状：当前已新增撤销，但仍无重做、无多人协作
- 影响：内部试用可以，但实际编排效率有限
- 建议：下一步补重做，再考虑吸附、复制编排、批量操作

#### 8. 开发态依赖 `--experimental-strip-types` 与本地对象存储适配层

- 现状：`mock-api` 既依赖 Node 实验特性，也还没接真实 OSS
- 影响：Node 版本变化和对象存储切换都可能带来环境差异
- 建议：中期切到更稳的 TS 运行方案，或统一走构建后启动

## 6. 建议的补齐顺序

建议按下面顺序推进，不要并行摊太开：

1. 收敛前端 bundle 体积，先处理最重 chunk
2. 明确资产单一真相源，解决前后端双份目录问题
3. 补最小 E2E 或关键流程测试
4. 再继续做撤销/重做和更强的编辑器能力
5. 视真实后端接入计划，再扩展 runtime 合同

## 7. 当前结论

这个仓库的主干依旧清楚，方向没跑偏。当前最成熟的是“场景编排主链路 + runtime 闭环 + 基础质量门禁”，最薄弱的是“性能收敛、资产单一真相源、以及从可演示 MVP 走向可实施版本”的这段。

如果只做一件最值的事，先压 bundle 和收敛资产目录，收益最大。
