# Mock Scene Service Design

**Date:** 2026-03-24

**Goal**

在当前仓库内新增一个 `Node + Express` 的 mock 后端服务，统一提供设备库与单当前场景的 HTTP 接口，并将前端从静态文件/本地假数据切换到 API 调用，为后续真实后端替换保留稳定边界。

## 1. Scope

本次只覆盖场景主链路，优先满足“输出场景”这个项目核心目标。

包含：

- 新增 `apps/mock-api` workspace
- 提供设备库接口
- 提供单当前场景读取、覆盖保存、重置示例接口
- 文件持久化，重启后数据保留
- 前端切换到统一 API 客户端
- 在编排页提供显式“保存到后端”操作

不包含：

- 多场景管理
- 用户/权限
- 自动保存
- 详情页运行态、告警、趋势等 mock API
- 真实后端协议对齐

## 2. Architecture

### 2.1 Service Layout

新增独立 workspace：

```text
apps/mock-api/
  package.json
  src/
    server.ts
    routes/
      health.ts
      scene.ts
      equipment.ts
    lib/
      fileStore.ts
      httpErrors.ts
  data/
    scene/
      current.scene.json
      demo.scene.json
    equipment/
      catalog.json
      <assetId>/
        asset.json
        ports.json
```

服务职责保持单一：

- `scene` 路由只处理当前场景
- `equipment` 路由只处理设备库
- `fileStore` 只负责文件读写、目录确保和 JSON 解析/落盘

### 2.2 Frontend Boundary

前端新增 API 服务层，例如：

```text
apps/twin-web/src/services/api/
  client.ts
  sceneApi.ts
  equipmentApi.ts
```

页面和 UI 组件不直接 `fetch('/public/...')`，而是通过 API 服务调用：

- `EditorPage` / `OverviewPage` 读取设备库
- `loadDemoSceneIntoStore` 改为调用场景重置接口
- `SceneJsonToolbar` 负责显式保存当前场景到后端

## 3. API Design

统一前缀：`/api`

### 3.1 Health

`GET /api/health`

返回：

```json
{
  "ok": true,
  "service": "mock-api",
  "time": "2026-03-24T12:00:00.000Z"
}
```

### 3.2 Scene

`GET /api/scene`

- 返回当前场景
- 响应结构直接对齐 `SceneFile`

`PUT /api/scene`

- 请求体为完整 `SceneFile`
- 服务端先校验，校验通过后覆盖写入 `current.scene.json`
- 成功返回：

```json
{
  "ok": true,
  "updatedAt": "2026-03-24T12:00:00.000Z"
}
```

`POST /api/scene/reset-demo`

- 将 `demo.scene.json` 覆盖到 `current.scene.json`
- 返回重置后的场景，减少前端多一步重复请求

### 3.3 Equipment

`GET /api/equipment/catalog`

- 返回：

```json
{
  "assets": ["chiller_centrifugal_v1", "chw_pump_v1"]
}
```

`GET /api/equipment/:assetId`

- 返回单资产 `asset.json`

`GET /api/equipment/:assetId/ports`

- 返回单资产 `ports.json`

## 4. Data Validation

### 4.1 Backend Validation

服务端必须校验：

- `scene` 写入前符合 `SceneFile`
- `catalog`、`asset`、`ports` 读取后符合当前约定结构

优先复用现有前端 schema 定义，避免两套数据约束漂移。如果直接复用前端源码成本过高，则在 mock 服务里复制最小 schema，并保持字段完全一致。

### 4.2 Frontend Validation

前端仍保留当前 `zod` 校验，不信任后端返回：

- `loadEquipmentCatalog`
- `loadEquipmentAssetsByIds`
- `loadDemoSceneIntoStore`
- 场景保存前的本地导入

这样后续替换真实后端时，不需要重写前端防御逻辑。

## 5. Frontend Behavior Changes

### 5.1 Editor

- 保留本地“导入 JSON”能力
- 新增“保存到后端”按钮，将当前 store 中的场景经 `PUT /api/scene` 持久化
- “加载示例场景”改为调用 `POST /api/scene/reset-demo`
- “导出 scene.json”继续保留，作为离线备份与调试手段

### 5.2 Overview

- 设备库改为走 `/api/equipment/*`
- 初次无场景时仍可自动加载当前场景；若当前场景不存在或损坏，则给出明确错误

### 5.3 Configuration

前端新增环境变量：

- `VITE_API_BASE_URL`

默认开发可指向：

```text
http://localhost:3001/api
```

## 6. Error Handling

### 6.1 Backend

- 文件不存在：`404` 或 `500`，取决于资源是否是必须资源
- JSON 损坏/结构非法：`500`
- 请求体校验失败：`400`
- 所有错误返回统一结构：

```json
{
  "ok": false,
  "error": "示例场景校验失败：version: Invalid input"
}
```

### 6.2 Frontend

- API 请求失败后写入现有 `editorUi.lastError`
- 设备库读取失败时，编排页与总览页给出可见错误，而不是静默空状态
- mock 服务未启动时，错误信息需明确包含“无法连接 API”或 HTTP 状态

## 7. Testing Strategy

本次不引入新的测试框架，先保证最小闭环和构建可用。

### 7.1 Required Commands

- `npm run lint -w twin-web`
- `npm run build -w twin-web`
- `npm run build -w mock-api`

### 7.2 Manual Verification

1. 启动 `mock-api`
2. 前端成功加载设备库
3. 点击“加载示例场景”后画布成功更新
4. 修改场景并点击“保存到后端”成功
5. 刷新页面后场景仍存在
6. 重启 `mock-api` 后场景仍存在

## 8. Tradeoffs

### 推荐方案

独立 `apps/mock-api` 服务。

原因：

- 与未来真实后端边界一致
- 前端不会被 dev-only middleware 绑死
- 文件持久化便于调试与提交测试数据

### 暂不做的复杂化

- 不做多场景列表，避免接口和 UI 过早扩张
- 不做自动保存，避免把每次拖拽都转成写盘风暴
- 不做运行态接口，聚焦当前项目最关键的“场景输出”闭环

## 9. Implementation Notes

实现时优先保持以下不变：

- `SceneFile` 作为场景主契约
- 现有设备资产目录和字段定义
- 前端编辑器交互和 store 结构

实现时允许的最小必要调整：

- 增加前端 API 服务层
- 给编排页工具条新增保存动作
- 为根目录新增启动脚本，便于分别启动 web 和 mock-api
