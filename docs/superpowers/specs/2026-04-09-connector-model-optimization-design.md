# 连接点模型优化设计

## 背景

当前资产中心和场景编排器里的端口配置，仍然是一个偏底层的“坐标表”模型：

- 资产侧使用 `portKey / name / position / system / direction`
- 场景侧沿用 `portGroups[].ports[]`
- 管线端点通过字符串引用，例如 `deviceId.portId`

这套设计在 MVP 阶段够用，但已经暴露出明显问题：

1. 业务语义太弱
2. 端点编辑过度暴露三维坐标
3. 未来设备绑定/点位绑定缺少自然挂接点
4. 连接点的约束、分组和方向信息不足
5. 资产中心的端口编辑器更像“数据表”，不像“设备模板配置”

用户已经明确感受到“端点配置设计让人很难受”，说明问题已经不是单纯的 UI 样式，而是模型抽象层次不对。

## 目标

本轮设计的目标不是一次性推翻全部场景连接系统，而是在保持现有编排器可用的前提下，把“端口”升级为“连接点模板（connector）”：

1. 让资产侧连接点拥有更强的业务语义
2. 保留对现有管线与 `portGroups` 的兼容
3. 把“业务语义”和“几何坐标”分层
4. 为未来设备绑定、点位绑定、实时信息接入预留结构
5. 让资产管理页的编辑体验从“裸坐标表”升级为“语义优先、几何次之”

## 非目标

本轮不包含：

- 连接点三维拖拽编辑
- 管线系统整体改名为 connector graph
- scene.json 全量格式升级
- 自动迁移所有历史场景文件
- 真正接入实时点位绑定
- 复杂拓扑约束求解

## 总体思路

### 核心判断

当前“端口”承担了两个角色：

1. 业务连接语义
2. 三维几何锚点

这两个角色应该拆开。

### 推荐方案

把资产侧的 `ports` 升级为 `connectors`，并在每个连接点里分成三类信息：

1. **业务语义**
2. **几何信息**
3. **绑定占位**

同时，为了不立即打断现有场景与管线系统：

- 场景层暂时仍保留 `portGroups`
- 管线端点字符串仍保留 `deviceId.portId`
- 但资产中心和设备目录开始以 `connector` 作为内核模型
- 对外兼容输出时再投影回现有 `ports` 形态

这意味着本轮是“内核升级 + 兼容投影”，而不是“一刀切格式替换”。

## 新的数据模型

### 1. 资产连接点主模型

建议把当前 `equipment_ports` 升级成 `equipment_connectors`。

字段建议：

- `id`
- `asset_id`
- `connector_key`
- `name`
- `system`
- `role`
- `medium`
- `direction`
- `side`
- `group_key`
- `required`
- `sort_order`

含义：

- `connector_key`：稳定业务键，对应今天的 `portKey`
- `role`：连接点角色，例如 `supply / return / inlet / outlet / drain / power_in / power_out`
- `medium`：介质类型，例如 `water / air / electric / steam`
- `side`：安装面，例如 `left / right / front / back / top / bottom`
- `group_key`：分组，例如 `chilled_water`, `condenser_water`, `power`
- `required`：是否为连接必需点

### 2. 连接点几何信息

建议单独存为几何字段，而不是仅靠一个 `position`。

字段建议：

- `anchor_x`
- `anchor_y`
- `anchor_z`
- `normal_x`
- `normal_y`
- `normal_z`
- `snap_offset_x`
- `snap_offset_y`
- `snap_offset_z`

说明：

- `anchor_*`：连接点锚点坐标
- `normal_*`：连接点朝向，用于未来更稳定的布线和可视化提示
- `snap_offset_*`：给未来吸附或接管偏移预留

第一版可只要求 `anchor_*`，其余字段允许为空。

### 3. 连接点绑定占位

当前资产级 `bindings` 不能很好表达“哪个端点接哪个点位”。

建议新增 `equipment_connector_bindings`：

- `id`
- `connector_id`
- `binding_type`
- `binding_key`
- `binding_value`
- `note`

这样绑定不再只挂在资产级，而能自然下沉到连接点级。

## 兼容策略

### 设备目录兼容

现有前端编排器仍消费：

- `GET /api/equipment/:assetId/ports`

因此后端需要继续输出兼容形态：

```json
{
  "ports": [
    {
      "id": "chw_supply",
      "name": "冷冻水供水口",
      "position": [1.2, 0.3, 0],
      "system": "CHW",
      "direction": "out"
    }
  ]
}
```

但这个响应不再作为数据库原始结构，而是由 `connector` 数据投影生成。

### 场景兼容

现有场景文件：

- `portGroups[].ports[]`
- `pipe.from / pipe.to = deviceId.portId`

本轮继续保持，不直接升级场景格式。

原因：

- 当前编排器、三维画布、管线求解都依赖这套格式
- 一次性修改 scene schema 风险太大

过渡方式：

- 资产中心使用 `connector`
- 设备实例加入场景时，把 `connector` 投影成当前 `portDef`
- 编排器和保存场景仍继续使用旧格式

这样可以先优化资产模板和编辑体验，再逐步推进场景层升级。

## 资产管理页的交互改造

### 当前问题

现在的 [AssetPortsEditor.tsx](../../../apps/twin-web/src/components/assets/AssetPortsEditor.tsx) 本质上是一个“行编辑表格”，用户直接操作：

- `portKey`
- `x/y/z`
- `system`
- `direction`

这对真正的业务配置者不友好。

### 推荐交互

将连接点编辑器拆成三个层次：

#### A. 连接点列表

列表项显示：

- 名称
- 系统
- 角色
- 方向
- 侧别
- 是否已配置绑定

作用：

- 快速浏览设备模板有哪些连接点
- 让“连接点”先作为业务对象被识别，而不是坐标行

#### B. 连接点详情面板

点击列表项后，在详情区编辑：

- 基础语义
  - 名称
  - 系统
  - 角色
  - 介质
  - 方向
  - 侧别
  - 分组
  - 是否必需
- 高级几何
  - anchor 坐标
  - normal 朝向
- 绑定占位
  - 设备身份
  - 点位映射
  - runtime 字段

#### C. JSON 高级模式

保留给高级用户，但不再是默认编辑方式。

原则：

- 默认使用语义化表单
- JSON 只作为导入导出/批量修正工具

## 后端接口演进

### 第一阶段

兼容现有接口，同时新增内部语义：

- 继续保留：
  - `PUT /api/assets/:assetId/ports`
  - `GET /api/equipment/:assetId/ports`
- 但内部实现开始基于 `connectors`

### 第二阶段

新增新语义接口：

- `GET /api/assets/:assetId/connectors`
- `PUT /api/assets/:assetId/connectors`
- `PUT /api/assets/:assetId/connectors/:connectorKey/bindings`

等前端稳定后，再逐步淡化 `ports` 命名。

## 推荐的落地顺序

### 第一轮

只做“模型升级 + 资产页 UI 升级”，不动场景格式：

1. 数据表补 connector 语义字段
2. 资产页从“端口表”升级成“连接点编辑器”
3. `GET /api/equipment/:assetId/ports` 改为从 connector 投影输出

### 第二轮

做“连接点绑定细化”：

1. 绑定从资产级下沉到连接点级
2. 资产页显示每个连接点的绑定状态

### 第三轮

再考虑 scene schema 升级：

1. `portGroups` 是否演进为 `connectorGroups`
2. `pipe.from / to` 是否从字符串升级为结构化引用

## 结论

当前问题的本质不是端口表单不好，而是“连接点模型太底层”。最佳路径不是继续往 `ports` 上补零碎字段，而是：

1. 把 `port` 升级成 `connector`
2. 把业务语义和几何信息拆开
3. 保持对现有场景与设备目录接口的兼容投影
4. 在资产管理页里把编辑体验改成“连接点模板编辑”，而不是“坐标行编辑”

这条路径能在不打断现有编排器的情况下，给后续设备绑定、点位绑定和实时信息接入打下正确的结构基础。
