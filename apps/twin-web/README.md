# twin-web — 场景编排与展示前端

## 项目补充文档

- 仓库级技术栈与风险清单：`../../docs/project-tech-stack-and-risks.md`

## 路由（当前）

- `/` → 重定向到 **`/overview`**
- **`/overview`**：三维总览（只读场景 + 指标/模式/AI 摘要侧栏，点击设备进详情）
- **`/scenes`**：命名场景管理（创建、列表预览、进入编辑）
- **`/scenes/:sceneId/preview`**：命名场景只读预览（可操作视角、开启流动状态，不可编辑）
- **`/detail/:deviceId`**：设备详情（Mock 点位、ECharts 趋势、告警、模式与策略说明）
- **`/editor`**：场景编排；带 `sceneId` 查询参数时加载命名场景

## 视觉主题（孪生运维台）

统一为 **深 Slate 基底 + 冰青强调（`#45c4e8`）**：侧栏/工具条见 `src/index.css` 的 `--twin-*` 变量；3D 清屏、光照、地面、占位设备见 `src/theme/sceneTheme.ts`。管线系统色在 `src/constants/systemColors.ts`，与主色同系、饱和度偏低，避免「彩虹管线」。改主题时请以这两处为唯一来源。

## 坐标系（Sprint 0）

- **单位**：米（m）。
- **轴向**：**Y 向上**（Three.js 默认），X/Z 为水平面。
- **原点**：建议与房间/CAD 图框约定角点或柱网基准一致；导入场景前由实施在 CAD 导出或描图时与 JSON 对齐。

## 场景与资产版本

- **`scene.json` 根字段 `version`**：场景文件格式版本（整数），用于后续迁移；与设备 `asset.json` 中的 **`assetVersion`** 独立。
- **`assetVersion`**：单个设备模板（几何/端口）变更时递增；旧场景仍可加载，但若端口定义不兼容需人工重绑或脚本迁移。

## 管线 MVP 档位

- **首期**：**仅冲突高亮**。正交管线路径照常生成；若任一直线段与**除管线两端设备外**的其它设备**世界轴对齐包围盒**相交，则整条管线以**红色**显示（不做自动绕障）。

## 设备与场景数据来源

运行时以 `mock-api` 为单一读取入口：

- `GET /api/equipment/catalog`：资产 ID 列表
- `GET /api/equipment/{assetId}`：资产描述，最少字段：
  - `assetVersion`（正整数）
  - `assetId`
  - `displayName`、`type`、`defaultSystem`
  - `bounds.halfExtents`：`[hx, hy, hz]`（局部空间半长，用于占位 Box 与碰撞）
  - `modelGlb`（可选）：为 `true` 时前端通过后端返回的模型地址加载 GLB；失败则回退占位体，并在界面提示
- `GET /api/equipment/{assetId}/ports`：`ports[].id|name|position|system|direction`，其中 **`position` 为设备局部坐标**
- `GET /api/scene` / `PUT /api/scene`：当前工作场景
- `GET /api/scene/library` / `GET|PUT /api/scene/library/:sceneId`：命名场景列表与内容
- `POST /api/scene/library/:sceneId/load`：把命名场景载入当前工作场景

## 数据模型映射（与《场景编辑器方案》5.1）

- 文件内使用 `portGroups: { deviceId, ports[] }[]`，与文档中分设备的 `port` 块一一对应。
- `device` 较文档额外包含 **`boundsHalfExtents`**（与资产 `bounds.halfExtents` 一致并随场景持久化），保证无目录时仍可碰撞与占位。

## 开发与构建

```bash
# 仓库根目录
npm install
npm run dev
npm run check
```

浏览器打开终端提示的本地 URL（默认可为 `http://localhost:5173`）。

- **命名场景流转**：先在 `/scenes` 创建场景，再进入 `/scenes/:sceneId/preview` 查看三维效果，或跳到 `/editor?sceneId=...` 继续编辑。
- **加载示例场景**：编排页工具条「加载示例场景」会通过后端重置/载入当前示例场景。
- **压测**：工具条「压测：80 台 + 管线」，或 URL 查询参数 **`?stress=80`**（上限 500），用于在目标机器上感受帧率并记录卡顿（阶段 1 性能基线）。

## 运行态数据链路（阶段 2 当前形态）

- `/overview` 与 `/detail/:deviceId` 不再直接在前端生成运行态，而是通过 `mock-api` 的 `GET /api/runtime/overview` 与 `GET /api/runtime/devices/:deviceId` 拉取。
- 前端当前使用 **10 秒轮询** 刷新 overview 与 detail 运行态。
- 后端默认根据 `current.scene.json` 中的设备清单动态生成 deterministic 运行态，用于联调与演示。
- 若 `mock-api` 的数据根目录下存在 `runtime/snapshot.json`，后端优先使用其中的 `overview` 与 `devices[deviceId]` 作为覆盖数据。
- `DeviceDetailPage` 里的运行模式、策略说明、AI 建议目前仍是前端默认文案，不属于本轮 runtime API 的后端职责。
- `npm test -w twin-web` 当前会同时跑 Node 侧 API/store 测试和 Vitest 页面级测试，覆盖 runtime 接线、场景管理、预览页与编排页命名场景加载。

## 性能基线（请在本机填写）

| 场景        | 设备数 | 管线数 | 分辨率 | 主观帧率/备注 |
| ----------- | ------ | ------ | ------ | --------------- |
| 示例 demo   | 2      | 1      |        |                 |
| stress=80   | 80     | ~40    |        |                 |

## 已知限制

- 无撤销/重做、无多人协作。
- 预览页是只读场景效果页，不承载设备详情面板或保存动作。
- 拖拽变换时端口小球在鼠标松开前可能短暂与占位体不同步（以属性面板与松手后状态为准）。
