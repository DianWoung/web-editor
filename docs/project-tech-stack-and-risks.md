# 项目技术栈与风险清单

## 1. 项目定位

本仓库是一个基于 Web 的机房数字孪生场景编辑与展示项目，采用 `npm workspaces` 管理两个应用：

- `apps/twin-web`：前端主应用，负责场景编排、三维总览、设备详情展示
- `apps/mock-api`：本地 Mock API，负责设备目录、场景 JSON 的读取与保存

当前落地状态更接近“阶段 1 已完成主干、阶段 2 开始接展示页”的形态。

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
- 前端当前运行态数据：本地 Mock 生成，无统一实时通道

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

已实际执行：

- `npm run build`：通过
- `npm run build:api`：通过
- `npm run -w mock-api test`：通过，6 个测试全部通过
- `npm run -w twin-web lint`：失败

当前前端 lint 失败点：

- `apps/twin-web/src/components/scene/windTurbineAsset.test.ts`
  - 存在 `@typescript-eslint/no-explicit-any`
- `apps/twin-web/src/components/scene/DeviceInstance.tsx`
  - 存在 `react-hooks/exhaustive-deps` 警告

当前前端生产构建还有明显包体告警：

- `TrendChart` chunk 约 `1.1 MB`
- `sceneStore` chunk 约 `791 KB`
- `loadDemoScene` chunk 约 `384 KB`

说明项目能构建，但前端质量门禁尚未完全收紧，性能也已出现早期预警。

## 5. 风险清单

### P0 高优先级风险

#### 1. 前端 lint 不通过，主分支质量门禁不完整

- 现状：前端代码当前不是“可 lint 通过”的状态
- 影响：后续新增功能时，问题容易继续扩散；CI 一旦接入会直接阻塞
- 建议：先修复现有 `any` 和 Hook 依赖问题，再把 lint 纳入合并前必跑项

#### 2. 前端构建包体偏大，后续扩容存在明显性能风险

- 现状：构建已出现大 chunk 告警
- 影响：首屏加载、总览页切换、大屏场景加载会越来越慢
- 建议：
  - 把图表、场景编辑能力、重型服务拆分得更细
  - 避免把大对象和大逻辑长期堆在共享状态模块
  - 后续引入真实 GLB 资产前先做一次 bundle 分析

#### 3. `sceneStore` 职责过重，编辑态与展示态强耦合

- 现状：场景数据、选中态、编辑器 UI、流动开关都在一个 store 里
- 影响：功能继续增加后，页面间互相污染状态的概率会上升，维护成本会变高
- 建议：
  - 拆出 `editorUiStore` 或 `runtimeStore`
  - 让展示页和编辑页共享“场景数据”，但不共享过多瞬时 UI 状态

#### 4. 总览页和详情页仍主要依赖本地 Mock，未形成真实运行态链路

- 现状：总览 KPI 基本写死，详情页运行态来自本地函数生成
- 影响：演示可以继续，但一接真实接口就会暴露模型、刷新机制、错误处理缺口
- 建议：
  - 先做统一 runtime 数据层
  - 再定义轮询 / WebSocket / SSE 中的一种真实接入方式

### P1 中优先级风险

#### 5. 持久化仍是单机文件写入，不具备并发与审计能力

- 现状：`mock-api` 直接读写 `current.scene.json`
- 影响：多人操作、环境隔离、版本留痕、回滚能力都不成立
- 建议：
  - 阶段 2 至少补“保存版本时间戳 + 发布源”
  - 阶段 3 再考虑接数据库或对象存储

#### 6. 前后端设备资产存在双份目录，容易漂移

- 现状：
  - 前端：`apps/twin-web/public/equipment`
  - 后端：`apps/mock-api/data/equipment`
- 影响：资产 JSON、端口定义、模型引用可能不同步
- 建议：
  - 明确单一真相源
  - 通过脚本同步或构建产物生成，避免双写

#### 7. 自动布线还是 MVP 级别，复杂场景下会很快碰到上限

- 现状：当前是正交路径 + 碰撞检测，复杂避障还没做
- 影响：设备数量一上来，手工修线成本会明显增加
- 建议：
  - 短期保持“MVP + 冲突高亮”
  - 中期补手工节点编辑，再评估自动避障

#### 8. 前端自动化测试覆盖偏薄

- 现状：前端只有少量测试，主要集中在资产导入和风机资产相关逻辑
- 影响：核心路径变更后容易回归
- 建议：
  - 补 3 条关键链路
  - 场景加载
  - 设备摆放与保存
  - 总览跳详情

### P2 低优先级风险

#### 9. 编辑器能力仍偏 MVP，缺少常用生产功能

- 现状：README 已明确无撤销/重做、无多人协作
- 影响：内部试用可以，但实际编排效率有限
- 建议：优先补撤销/重做，再考虑吸附、复制编排、批量操作

#### 10. 开发态依赖 `--experimental-strip-types`

- 现状：`mock-api` 开发脚本依赖 Node 实验特性
- 影响：Node 版本变化时可能出现兼容性波动
- 建议：中期切到更稳的 TS 运行方案，或统一走构建后启动

## 6. 建议的补齐顺序

建议按下面顺序推进，不要并行摊太开：

1. 修前端 lint 红线，恢复基本质量门禁
2. 收敛前端 bundle 体积，先处理最重 chunk
3. 抽离运行态数据层，让总览和详情不再各自拼 Mock
4. 明确资产单一真相源，解决前后端双份目录问题
5. 补最小 E2E 或关键流程测试
6. 再继续做撤销/重做和更强的编辑器能力

## 7. 当前结论

这个仓库的主干是清楚的，方向也没跑偏，最成熟的是“场景编排主链路”，最薄弱的是“工程质量门禁”和“从 Mock 过渡到真实运行态”的这一段。

如果只做一件最值的事，先把前端 lint 和运行态数据层补齐，收益最大。
