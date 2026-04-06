# SQLite-Backed Delivery-Like Backend Design

**Date:** 2026-04-05

## Goal

将当前以 JSON 文件和前端静态资产为主的 mock 形态，升级为更接近真实客户交付的后端主导架构：

- 前端不再依赖 `apps/twin-web/public/equipment/**`
- 后端成为资产、场景、运行态快照、版本与发布记录的单一真相源
- SQLite 承担结构化数据存储
- `model.glb` 继续走后端受控文件仓，而不是放入 SQLite

第一版目标不是做“完整生产系统”，而是做一套足够贴近交付形态、又能在本仓库内稳定演示和迭代的骨架。

## Scope

### In Scope

- 用 SQLite 替换运行期对 `apps/mock-api/data/**` JSON 的主依赖
- 前端通过后端 API 获取资产目录、资产元数据、端口、场景
- 后端通过受控文件路径提供 `model.glb`
- 场景当前态、场景版本、发布记录进入数据库
- runtime snapshot 进入数据库
- 提供一个 demo 初始化脚本，将现有 JSON 资产与示例场景导入 SQLite

### Out of Scope

- 多用户权限系统
- 外部真实遥测采集
- 多租户
- 把 GLB 二进制写入 SQLite
- 完整客户级审计与审批流
- 复杂数据库迁移框架

## Current Problems

### 1. 前端仍存在静态资产运行时依赖

当前 `twin-web` 仍通过 `public/equipment/**` 拼接模型 URL。即使元数据已走后端，前端仍保留了一份可运行资产目录，无法模拟真实交付中的“后端统一提供资产”形态。

### 2. 后端运行态与场景仍是文件驱动

`mock-api` 当前用 JSON 文件读写场景、资产与 runtime 覆盖。这样适合快速原型，但不适合继续演进到版本、发布、回放和更像客户现场的操作流。

### 3. 资产、场景、运行态缺少统一数据边界

目前资产元数据、模型文件、场景当前态、demo 场景、runtime 覆盖散落在多个目录中。边界分散会让后续版本管理、发布记录、数据导入导出都变得脆弱。

## Design Decision

本次采用：

- `SQLite + 后端文件资产仓`
- 结构化数据全部进入 SQLite
- 二进制模型文件保留在后端文件系统，由后端 API 或受控静态路径统一暴露

不采用：

- 继续以 JSON 作为运行期主存储
- 将 GLB 二进制写入 SQLite
- 保留前端 `public/equipment/**` 作为运行期兜底来源

原因：

- JSON 运行期主存储无法支撑版本、发布与更接近交付的治理边界
- SQLite 不适合作为第一版的大量模型二进制仓储
- 只要前端继续可直接读取本地静态资产，就还存在双真相源

## Target Architecture

### Backend

`apps/mock-api` 升级为单一业务后端，职责包括：

- 资产目录、资产详情、端口信息查询
- 场景当前态读取与保存
- 场景版本写入与查询
- 场景发布记录写入与查询
- runtime overview/detail 查询
- runtime snapshots 管理
- GLB 文件访问

运行时数据来源分为两类：

1. 已激活 snapshot
2. 按当前活动场景生成的 deterministic runtime

### Frontend

`twin-web` 只通过 API 工作：

- 加载资产目录与资产详情
- 加载当前场景
- 保存当前场景
- 读取 runtime 数据
- 使用后端返回或约定的资产模型地址加载 `model.glb`

前端运行时不再依赖 `public/equipment/**`。

### File Storage Boundary

只保留后端受控资产文件仓，例如：

```text
apps/mock-api/storage/assets/<assetId>/model.glb
```

数据库中只保存 `model_path` 或等价字段，不保存 GLB 二进制。

## Data Model

### `equipment_assets`

保存资产主记录。

建议字段：

- `asset_id` TEXT PRIMARY KEY
- `asset_version` INTEGER NOT NULL
- `display_name` TEXT NOT NULL
- `type` TEXT NOT NULL
- `default_system` TEXT NOT NULL
- `bounds_json` TEXT NOT NULL
- `render_style` TEXT
- `has_model` INTEGER NOT NULL DEFAULT 0
- `model_path` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

说明：

- `bounds_json` 保存 `halfExtents`
- `model_path` 是后端文件仓内相对路径或受控路径

### `equipment_ports`

保存资产端口定义。

建议字段：

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `asset_id` TEXT NOT NULL
- `port_id` TEXT NOT NULL
- `name` TEXT NOT NULL
- `position_json` TEXT NOT NULL
- `system` TEXT NOT NULL
- `direction` TEXT NOT NULL

约束：

- `FOREIGN KEY(asset_id) REFERENCES equipment_assets(asset_id)`
- `UNIQUE(asset_id, port_id)`

### `scenes`

保存当前场景记录。

建议字段：

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL
- `is_active` INTEGER NOT NULL DEFAULT 0
- `scene_json` TEXT NOT NULL
- `source` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

说明：

- 第一版允许直接把完整 `SceneFile` 存成 `scene_json`
- `is_active=1` 表示当前系统正在使用的场景

### `scene_versions`

保存版本快照。

建议字段：

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `scene_id` INTEGER NOT NULL
- `version_no` INTEGER NOT NULL
- `scene_json` TEXT NOT NULL
- `change_note` TEXT
- `created_at` TEXT NOT NULL

约束：

- `FOREIGN KEY(scene_id) REFERENCES scenes(id)`
- `UNIQUE(scene_id, version_no)`

### `scene_publish_records`

模拟客户交付环境中的发布留痕。

建议字段：

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `scene_id` INTEGER NOT NULL
- `scene_version_id` INTEGER NOT NULL
- `published_by` TEXT NOT NULL
- `published_at` TEXT NOT NULL
- `target_env` TEXT NOT NULL
- `note` TEXT

### `runtime_snapshots`

保存运行态覆盖数据。

建议字段：

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `scene_id` INTEGER
- `snapshot_name` TEXT NOT NULL
- `overview_json` TEXT
- `devices_json` TEXT NOT NULL
- `is_active` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL

说明：

- 一个时间点只允许一个 active snapshot
- `scene_id` 可选，允许做跨场景演示快照

## API Design

### Existing APIs Kept

- `GET /api/equipment/catalog`
- `GET /api/equipment/:assetId`
- `GET /api/equipment/:assetId/ports`
- `GET /api/scene`
- `PUT /api/scene`
- `POST /api/scene/reset-demo`
- `GET /api/runtime/overview`
- `GET /api/runtime/devices/:deviceId`

这些接口尽量保持前端兼容，底层实现切到 SQLite。

### New APIs

- `GET /api/assets/:assetId/model`
  - 返回对应 `model.glb`
- `GET /api/scene/versions`
  - 查询当前场景的版本列表
- `POST /api/scene/versions`
  - 为当前场景创建新版本
- `GET /api/scene/publish-records`
  - 查询发布记录
- `POST /api/scene/publish`
  - 记录一次发布动作
- `GET /api/runtime/snapshots`
  - 查询 runtime snapshots
- `POST /api/runtime/snapshots/activate/:snapshotId`
  - 激活指定 snapshot

## Frontend Changes

### Asset Loading

前端应删除对 `public/equipment/**` 的运行时依赖。

`loadEquipmentCatalog()` 继续通过后端 API 获取资产信息，但模型地址改为：

- 后端直接返回 `modelUrl`
  或
- 前端按约定拼装 `/api/assets/:assetId/model`

推荐后端返回 `modelUrl`，这样后续可更灵活切换存储路径。

### Scene Loading

编辑页、总览页、详情页继续使用当前 scene API，但数据来自 SQLite。

### Runtime Loading

保持现有 runtime store 和 polling 机制，不在本次重做前端 runtime 架构。

## Migration Strategy

用户已明确本轮采用：

- 不保留运行期对旧 JSON 目录的兼容
- 只保留 demo 导入脚本
- 运行期完全以 SQLite 为准

因此迁移策略为：

1. 新增 SQLite schema 与仓储层
2. 新增 demo 初始化脚本
3. 将现有 JSON 资产、端口、示例场景导入 SQLite
4. 将 GLB 拷贝到后端文件仓
5. 切换 API 实现到 SQLite
6. 删除前端对 `public/equipment/**` 的运行时依赖

## Testing Strategy

### Backend

必须覆盖：

- SQLite 初始化
- 资产目录查询
- 资产详情与端口查询
- 当前场景读取/保存
- 版本创建与查询
- 发布记录写入
- runtime snapshot 激活
- 资产模型文件访问

### Frontend

必须覆盖：

- 资产目录仍可被前端成功加载
- 页面运行时不再依赖 `public/equipment/**`
- overview/detail runtime 测试继续通过

## Risks

### 1. SQLite schema 虽简单，但接口切换范围大

这一轮会同时动到资产、场景和 runtime snapshot 的数据源，改动面较广，需要分阶段切换。

### 2. 模型文件仓路径管理容易出错

若 `model_path` 与真实文件仓不一致，会出现“元数据存在但模型无法加载”的问题，必须补测试与启动期检查。

### 3. 场景版本与当前活动场景的一致性需要明确

如果版本创建、激活、发布没有清晰边界，后续很容易出现“当前场景”和“已发布版本”不一致的问题。

## Recommended Rollout

建议分三步落地：

1. 先替换后端存储层为 SQLite，但保持现有 API 形状基本不变
2. 再把模型文件服务切到后端统一路径，删除前端 `public/equipment/**` 依赖
3. 最后补版本、发布记录和 runtime snapshot 管理接口

这样可以把“存储切换”“前端资产去静态化”“交付态治理能力”拆开，避免一次改太宽。

## Decision Summary

本次最终设计选择为：

- 结构化数据：SQLite
- 模型二进制：后端文件仓
- 前端运行时：只走后端 API
- 旧 JSON：只作为 demo 初始化输入，不再参与运行期
- 版本与发布：第一版即纳入设计范围
