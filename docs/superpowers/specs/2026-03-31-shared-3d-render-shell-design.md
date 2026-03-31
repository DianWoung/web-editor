# Shared 3D Render Shell Design

**Date:** 2026-03-31

**Goal**

将编辑器和查看器当前重复的 3D `Canvas` 外壳收敛为一套共享渲染壳层，并通过清晰的场景挂载位复用公共渲染环境；本次只解决“渲染壳层 + 场景内容装配”问题，不扩展为新的共享 runtime 状态系统。

## 1. Scope

本次设计只覆盖 `apps/twin-web` 内编辑器与查看器的 3D 画布公共外壳。

包含：

- 新增共享 `SceneCanvasShell`
- 新增共享 `SceneContent`
- 将 `EditorCanvas` 和 `ViewerCanvas` 收敛为页面装配层
- 消除两者在 `Canvas`、renderer 初始化、灯光、背景、地面上的重复实现
- 保持现有 editor/viewer 交互行为不变

不包含：

- 新建 shared runtime store
- 重构 `sceneStore` / `runtimeStore` 的职责边界
- 引入新的 scene context 或 feature registry
- 重做 `DeviceInstance` / `PipeRun` 的内部逻辑
- 调整 HUD、页面布局、2D 面板层结构
- 接入新的业务运行态来源或真实接口

## 2. Current Problems

当前结构存在三类问题：

### 2.1 Canvas 外壳重复

`EditorCanvas` 与 `ViewerCanvas` 都各自维护：

- `Canvas`
- `gl` 默认配置
- 相机初始值
- 背景色
- 光源组合
- `configureTwinWebRenderer(gl)`
- `RoomFloor`

这部分重复会让后续任何渲染设置变更都需要双改，并增加行为漂移风险。

### 2.2 场景组织层重复

两边都要遍历：

- `devices`
- `portGroups`
- `pipes`

然后将这些数据装配为 `DeviceInstance` 与 `PipeRun`。虽然 editor/viewer 有交互差异，但“如何把场景节点挂进 3D 树”本身已经具备共享条件。

### 2.3 运行时边界不清

当前“3D 场景运行时”与“业务运行态”容易混淆：

- 画布 renderer 配置属于渲染运行时
- `flowEnabled`、设备详情跳转、编辑选中态属于业务层

如果直接把这些都塞进同一个抽象里，新的共享壳层很容易退化成另一个带业务耦合的大组件。

## 3. Design Decision

本次采用：

- `SceneCanvasShell + SceneContent` 双层模式
- `SceneCanvasShell` 完全无业务感知

不采用：

- 只抽一个 `BaseSceneCanvas` 然后继续在两个页面里各自拼场景树
- 用 Hook 暴露 renderer 默认配置但保留两套 `Canvas` 外壳
- 一步到位引入新的 runtime config / context / preset 系统

原因：

- 只抽外壳不抽场景内容，后续仍会保留大段重复装配代码
- Hook 方案过于灵活，难以真正压平结构
- 一步做到完整 runtime 容器会超出本次“共享渲染壳层”的范围，风险过大

## 4. Target Architecture

### 4.1 Layering

目标结构如下：

```text
EditorCanvas
  ├ read scene/editor state
  ├ assemble editor controls
  └ SceneCanvasShell
      ├ shared renderer environment
      ├ controls slot
      └ SceneContent(editor params)

ViewerCanvas
  ├ read scene/runtime/router state
  ├ assemble viewer controls
  └ SceneCanvasShell
      ├ shared renderer environment
      ├ controls slot
      └ SceneContent(viewer params)
```

### 4.2 Responsibilities

#### `SceneCanvasShell`

职责：

- 创建 `Canvas`
- 提供共享 `gl` 配置
- 统一背景色、tone mapping、color space
- 统一共享光源
- 调用 `configureTwinWebRenderer(gl)`
- 提供地面 `RoomFloor`
- 提供 controls 挂载位
- 提供 3D 内容挂载位
- 接收通用画布事件和样式参数

非职责：

- 读取任意 store
- 读取路由或导航对象
- 决定 editor/viewer 模式
- 了解设备、管线、selection、runtime
- 写入业务错误状态

#### `SceneContent`

职责：

- 渲染设备节点
- 渲染管线节点
- 组织 `DeviceInstance` / `PipeRun` 所需的共享装配流程
- 通过 props 接收 editor/viewer 差异参数

非职责：

- 创建 `Canvas`
- 初始化 renderer
- 自行读取 store
- 自行决定页面级导航或 selection 策略

#### `EditorCanvas` / `ViewerCanvas`

职责：

- 从现有 store / router 读取所需数据
- 准备 controls
- 将状态和事件整理成 `SceneCanvasShell` / `SceneContent` 的 props
- 保留各自页面特有的交互接线

## 5. Component Interfaces

### 5.1 `SceneCanvasShell`

建议接口保持最小化：

```ts
type SceneCanvasShellProps = {
  camera: {
    position: [number, number, number]
    fov: number
    near: number
    far: number
  }
  showGrid: boolean
  background?: string
  cursor?: string
  onPointerMissed?: () => void
  onFloorClick?: (point: [number, number, number]) => void
  controls?: React.ReactNode
  children?: React.ReactNode
}
```

接口原则：

- `camera` 明确由页面装配层提供，避免 shell 偷带页面假设
- `camera` 语义定义为“挂载时初始相机配置”，不是受控运行时相机状态
- `SceneCanvasShell` 只在首次挂载时将 `camera` 传给 `Canvas`
- 后续 prop 变化不驱动相机自动重置；editor 的相机重置仍由其现有 controls 逻辑负责
- orbit target、controls 内部状态、reset 行为继续由各自 controls 组件拥有，不纳入 shell API
- 行为对齐方式是：editor/viewer 继续使用当前各自的 controls 实现与默认 framing，仅复用共同 `Canvas` 壳
- `showGrid` 只控制地面网格显示
- `background` 可选，默认使用当前共享主题
- `cursor` 仅用于画布样式，不承载业务语义
- `onPointerMissed`、`onFloorClick` 仅保留通用事件出口
- `controls` 与 `children` 为唯二挂载位
- `onPointerMissed` 的契约是“发生了一次 true miss”，不向外承诺底层 pointer event 结构
- 业务方只能依赖“回调被触发”这一事实，不能依赖原始事件对象

事件优先级约定：

- 当用户点击到 `RoomFloor` 可命中区域时，只触发 `onFloorClick`
- floor 命中不视为 pointer missed，不再额外触发 `onPointerMissed`
- 点击任意非 floor 场景节点时，无论该节点是否消费后续业务交互，都不视为 pointer missed
- 只有未命中任何可交互对象且未命中 floor 时，才触发 `onPointerMissed`
- 这样 editor 可以同时支持“点地面放设备”和“点真正空白处清空选择”，两者不冲突

刻意不加入：

- `mode`
- `devices`
- `pipes`
- `selection`
- `flowEnabled`
- `overlay`
- `hud`

这些都属于业务场景装配层，而不是共享渲染壳层。

### 5.2 `SceneContent`

建议由装配层显式传入业务数据与差异参数：

```ts
type SceneContentProps = {
  devices: Device[]
  portGroups: PortGroup[]
  pipes: Pipe[]
  modelUrlByAssetId: Record<string, string | null | undefined>
  renderStyleByAssetId: Record<string, RenderStyle | undefined>
  showPipes: boolean
  flowEnabled: boolean
  deviceMode: 'editor' | 'viewer'
  selectedPipeId?: string | null
  pipeInteractive?: boolean
  onSelectPipe?: (pipeId: string) => void
  onOpenDevice?: (deviceId: string) => void
}
```

接口原则：

- `devices` 以 `device.id` 作为唯一标识
- `portGroups` 以 `portGroup.deviceId === device.id` 进行关联；同一 `device.id` 预期最多一个 `portGroup`
- `pipes` 继续使用现有 endpoint 编码格式，由 `PipeRun` / 现有解析逻辑解释
- 先接受“参数显式”，不急于再抽 context
- editor/viewer 的差异继续通过现有 `DeviceInstance` / `PipeRun` 入口表达
- 是否显示管线由装配层决定，避免 `SceneContent` 读编辑器 UI 状态
- 本次事件归属规则只有一条：除 `SceneContentProps` 显式列出的回调外，其余节点内部交互继续留在 `DeviceInstance` / `PipeRun` 内部
- `SceneContent` 不新建统一的“设备交互回调接口”，而是继续沿用 `DeviceInstance` / `PipeRun` 当前边界
- editor 下，设备选择、端口选线、设备变换等行为仍封装在 `DeviceInstance` 与 store 接线中，本次不外提
- viewer 下，设备点击跳转仍通过 `onOpenDevice` 下传到 `DeviceInstance`
- editor 下，管线选中能力通过 `pipeInteractive + selectedPipeId + onSelectPipe` 显式表达
- 这意味着本次共享的是“场景内容装配层”，不是“完整交互编排层”
- `SceneContent` 必须对不完整输入做防御式装配：
  - `devices` 渲染时按 `device.id` 去 `portGroups` 查找第一个匹配项；缺失时按空端口列表渲染对应设备
  - 缺失 `modelUrlByAssetId[assetId]` 时向 `DeviceInstance` 传 `null`，回退到占位体
  - 缺失 `renderStyleByAssetId[assetId]` 时回退到既有默认值
  - `pipes` 不在 `SceneContent` 层做二次 join，只原样下传 `devices` 与 `portGroups`
  - `pipes` 引用到无效端点时，不在 `SceneContent` 层抛错，由 `PipeRun` / 现有解析路径按当前行为处理

## 6. Scene Ownership Boundaries

### 6.1 What stays in `SceneCanvasShell`

这些属于共享渲染环境，应放在 shell：

- `Canvas`
- 共享 `gl` 配置
- 相机初始值接线
- 背景色
- 全部共享灯光
- `configureTwinWebRenderer(gl)`
- `RoomFloor`
- shell 根级样式，如 `cursor`

`RoomFloor` 放入 shell 的理由：

- 它更像场景基底，而不是具体业务节点
- editor 与 viewer 都需要它，只是交互和网格显示不同
- 将其留在 shell 可避免 content 再承担环境元素

### 6.2 What stays in `SceneContent`

这些属于场景业务内容，应放在 content：

- `DeviceInstance` 列表
- `PipeRun` 列表
- editor/viewer 对 `DeviceInstance` / `PipeRun` 的参数差异

### 6.3 What stays in page-level assembly

这些继续留在 `EditorCanvas` / `ViewerCanvas`：

- `useSceneStore`
- `useRuntimeStore`
- `useNavigate`
- editor 空白点击取消选中
- editor 地面放置设备逻辑
- viewer 点击设备进入详情逻辑
- editor 专用 `EditorOrbitControls`
- viewer 专用 `OrbitControls`

这些继续保留在现有场景节点组件内部，不在本次上提：

- `DeviceInstance` 的选中逻辑
- `DeviceInstance` 的端口点选与连线逻辑
- `DeviceInstance` 的设备变换控制逻辑
- `PipeRun` 的 editor 可选中逻辑

## 7. Data Flow

数据流保持单向：

1. 页面装配层从 store / router 取数据
2. 页面装配层生成 shell props 与 content props
3. `SceneCanvasShell` 仅消费渲染配置与通用事件
4. `SceneContent` 仅消费场景数据与有限的装配级交互参数
5. 只有 `SceneContentProps` 中显式声明的回调事件才回流到页面装配层，其余节点内部交互继续保留在现有组件内部

这样可以保持：

- `shell` 不直接依赖业务状态
- `content` 不偷偷读 store
- 页面装配层仍是唯一知道当前页面装配意图的地方
- 现有节点组件内部交互不会因这次抽层被迫重写

## 8. Migration Plan

迁移顺序固定为四步：

### 8.1 Step 1: Extract `SceneCanvasShell`

- 新增 `SceneCanvasShell`
- 先让 `EditorCanvas` 接入
- 确认 shell 接口足以承载当前 editor 需求
- 同时用 viewer 当前需求做一次 API 对照检查，确认接口没有 editor 专属字段后再结束 Step 1

### 8.2 Step 2: Move `ViewerCanvas` onto shell

- 将 `ViewerCanvas` 切到同一 `SceneCanvasShell`
- 清除两处 `Canvas` 与环境配置重复

### 8.3 Step 3: Extract `SceneContent`

- 将 devices / pipes 的共同装配层抽出到 `SceneContent`
- editor/viewer 继续各自传不同参数

### 8.4 Step 4: Tighten boundaries

- 检查 `SceneCanvasShell` 是否残留业务 props
- 检查 `SceneContent` 是否直接读 store
- 确认页面装配层仍然承担业务接线职责

每一步都应可单独验证与回滚，不做双页同时重构的大爆炸切换。

## 9. Error Handling

错误处理边界必须与层级一致。

### 9.1 `SceneCanvasShell`

只负责渲染壳层相关问题，例如：

- renderer 初始化接线问题
- `Canvas` 通用事件透传问题
- 公共地面点击事件接线问题

对外错误契约：

- `SceneCanvasShell` 与 `SceneContent` 不新增自己的错误 store 或 UI fallback
- 发现开发期契约错误时，保持抛出到最近的 React error boundary
- 可恢复的业务降级继续沿用现有节点组件行为，例如 `DeviceInstance` 模型加载失败后回退占位体
- 壳层不直接 `console.error` 业务错误，也不写入业务状态

它不负责：

- 写入 `editorUi.lastError`
- 处理业务模型加载错误
- 处理详情跳转失败

### 9.2 `SceneContent`

负责承载由设备/管线内容产生的参数透传与交互出口，但不新增自己的全局错误通道。

`DeviceInstance` 已有的 GLB 加载失败逻辑继续保留在其现有责任边界内，不因为本次抽层而迁移到 shell。

### 9.3 Page-level assembly

页面装配层继续承接：

- 选中态清理
- 放置行为
- 导航行为
- store 写入

这样错误不会跨层漂移。

## 10. Testing Strategy

测试以“边界是否被正确保留”为主，而不是重复验证 three.js 细节。

### 10.1 `SceneCanvasShell` tests

验证：

- `showGrid` 是否正确传给 `RoomFloor`
- `onPointerMissed` 是否被接到 `Canvas`
- `onFloorClick` 是否正确传给 `RoomFloor`
- `controls` 和 `children` 是否被挂载
- `camera` prop 变化时不会触发自动相机重置或替换既有 controls 行为
- floor 命中与 pointer missed 的优先级是否符合约定

### 10.2 `SceneContent` tests

验证：

- 给定 devices / pipes 时是否正确渲染场景节点
- `showPipes` 为假时是否隐藏管线
- editor/viewer 差异参数是否正确下传给 `DeviceInstance` / `PipeRun`
- `selectedPipeId`、`onSelectPipe`、`onOpenDevice` 是否只在需要处接线
- 缺失 `portGroup`、模型 URL、render style 时是否按约定降级而不是崩溃

### 10.3 `EditorCanvas` / `ViewerCanvas` assembly tests

验证：

- 是否从 store / router 读取了正确依赖
- 是否将正确 props 传给 `SceneCanvasShell`
- 是否将正确 props 传给 `SceneContent`
- shell API 是否同时满足 editor 与 viewer 的装配需要，而不需要新增 mode 专属字段

### 10.4 Behavior-level acceptance tests

验证本次 scope 明确承诺保持不变的用户可见行为：

- editor 在 floor placement 激活时点击地面可正常放置设备
- editor 点击真正空白区域时可清空 selection
- editor 点击 floor 不会误触发空白取消逻辑
- viewer 点击设备仍可进入详情页
- editor / viewer 都保持当前默认相机 framing 与 controls 行为

不重复测试：

- `DeviceInstance` 内部 GLB 加载细节
- `PipeRun` 的几何细节
- three renderer 的底层实现

## 11. Risks and Mitigations

### 11.1 Risk: shell 再次长回业务组件

如果把 `mode`、`selection`、`flowEnabled` 之类继续塞进 `SceneCanvasShell`，壳层会快速失焦。

缓解：

- 严格限制 shell props 为渲染环境和通用事件
- 所有业务状态都留在装配层或 content 层

### 11.2 Risk: `SceneContent` 变成新“大组件”

如果过度追求一次性统一，可能把太多 editor/viewer 差异挤进 content。

缓解：

- 本次只抽共同装配流程
- 保留 `DeviceInstance` / `PipeRun` 现有 mode 分支
- 不在本次引入 context 或 preset 系统

### 11.3 Risk: 改动过大导致双页同时回归

缓解：

- 按 editor shell -> viewer shell -> content 抽取 -> 边界收紧 的顺序实施
- 每一步都要求可单独验证

## 12. Success Criteria

满足以下条件时，本次设计目标达成：

- `EditorCanvas` 与 `ViewerCanvas` 不再各自维护一整套 `Canvas` 壳层
- 共享 renderer 环境只存在一个实现位置
- 设备与管线的共同装配层被收敛到 `SceneContent`
- `SceneCanvasShell` 不直接依赖业务 store、router 或 runtime 状态
- editor 与 viewer 的现有行为保持不变
- 新结构清楚表达“渲染环境”和“业务场景内容”的边界
- 事件归属规则清楚：只有显式 props 回调上提，其余节点交互保留在原组件内部
