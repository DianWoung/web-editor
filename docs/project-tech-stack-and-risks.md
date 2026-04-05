# 项目技术栈与风险清单

## 1. 项目定位

本仓库是一个基于 Web 的机房数字孪生场景编辑与展示项目，采用 `npm workspaces` 管理两个应用：

- `apps/twin-web`：前端主应用，负责场景编排、三维总览、设备详情展示
- `apps/mock-api`：本地 Mock API，负责设备目录、场景 JSON 的读取与保存

当前落地状态更接近“阶段 1 主干稳定、阶段 2 的 runtime 闭环和基础质量门禁已接上，下一步进入结构收敛与产品化补齐”的形态。

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
- 数据存储：本地 JSON 文件
- 接口职责：
  - `/api/scene`：读取、保存、重置当前场景
  - `/api/equipment/catalog`：设备目录
  - `/api/equipment/:assetId`：设备资产描述
  - `/api/equipment/:assetId/ports`：端口描述

### 2.4 资源与数据形态

- 三维模型格式：`GLB`
- 场景数据：`scene.json`
- 设备资产：`asset.json`
- 端口定义：`ports.json`
- 前端运行态数据：通过 `mock-api` 的 runtime 接口拉取，overview/detail 使用固定轮询

## 3. 关键模块

### 3.1 前端核心模块

- 路由入口：`apps/twin-web/src/App.tsx`
- 场景状态中心：`apps/twin-web/src/store/sceneStore.ts`
- 编排页：`apps/twin-web/src/pages/editor/EditorPage.tsx`
- 总览页：`apps/twin-web/src/pages/overview/OverviewPage.tsx`
- 详情页：`apps/twin-web/src/pages/detail/DeviceDetailPage.tsx`
- 场景 API：`apps/twin-web/src/services/api/sceneApi.ts`
- 设备 API：`apps/twin-web/src/services/api/equipmentApi.ts`
- 设备目录加载：`apps/twin-web/src/services/loadEquipmentCatalog.ts`
- 正交布线：`apps/twin-web/src/services/orthogonalRoute.ts`
- 碰撞检测：`apps/twin-web/src/services/pipeCollision.ts`

### 3.2 后端核心模块

- 应用入口：`apps/mock-api/src/app.ts`
- 场景路由：`apps/mock-api/src/routes/scene.ts`
- 设备路由：`apps/mock-api/src/routes/equipment.ts`
- 文件读写：`apps/mock-api/src/lib/fileStore.ts`

## 4. 当前已验证状态

2026-04-05 fresh verification:

- `npm test -w twin-web`：通过，`11` 个测试全部通过
- `npm test -w mock-api`：通过，`14` 个测试全部通过
- `npm run lint -w twin-web`：通过
- `npm run build`：通过
- `npm run build:api`：通过
- `npm run check`：通过

当前质量门禁状态：

- 仓库根级已提供 `lint`、`test`、`check` 聚合脚本
- 已新增 GitHub Actions CI，执行与本地一致的 `npm run check`
- 前端已补齐页面级 runtime 集成测试，覆盖 `/overview` 与 `/detail/:deviceId` 的 runtime 接线

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

#### 2. 资产目录仍有双份真相源，容易漂移

- 现状：
  - 前端：`apps/twin-web/public/equipment`
  - 后端：`apps/mock-api/data/equipment`
- 影响：资产 JSON、端口定义、模型引用仍可能不同步
- 建议：
  - 明确单一真相源
  - 用脚本同步或构建生成避免双写

#### 3. 页面级质量门禁刚补齐，还缺更完整的端到端视角

- 现状：已有 API/store 与页面级 runtime 集成测试，但还没有浏览器级 E2E
- 影响：路由、真实 canvas、浏览器交互链路仍可能存在未覆盖回归
- 建议：
  - 下一步补最小浏览器级 smoke 测试
  - 优先覆盖“总览进入详情”和“编排页保存场景”两条主链路

### P1 中优先级风险

#### 4. 持久化仍是单机文件写入，不具备并发与审计能力

- 现状：`mock-api` 直接读写 `current.scene.json`
- 影响：多人操作、环境隔离、版本留痕、回滚能力都不成立
- 建议：
  - 阶段 2 至少补“保存版本时间戳 + 发布源”
  - 阶段 3 再考虑接数据库或对象存储

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

#### 7. 编辑器能力仍偏 MVP，缺少常用生产功能

- 现状：README 已明确无撤销/重做、无多人协作
- 影响：内部试用可以，但实际编排效率有限
- 建议：优先补撤销/重做，再考虑吸附、复制编排、批量操作

#### 8. 开发态依赖 `--experimental-strip-types`

- 现状：`mock-api` 开发脚本依赖 Node 实验特性
- 影响：Node 版本变化时可能出现兼容性波动
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
