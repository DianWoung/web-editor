# 资产管理中心设计

## 背景

当前项目里的设备资产主要依赖两种方式进入前端：

1. 后端静态设备目录 `apps/mock-api/data/equipment/**`
2. 前端编排页设备库中的“导入 catalog.json / 导入资产包（文件夹）”

这两种方式都更偏本地 demo 和开发态，不符合真实 Web 交付习惯，主要问题有：

- 资产导入依赖浏览器本地文件选择，不适合运营后台
- `asset.json` / `ports.json` 是文件，不利于表单编辑、校验、审计和版本化
- 模型文件与资产配置混在同一导入链路中，不利于后续接对象存储
- 未来要做设备绑定、点位绑定和数据绑定时，当前结构扩展性较差

用户希望把设备组件导入升级为“资产管理中心”：

- 新增独立资产管理页 `/assets`
- 模型文件采用对象存储思路，但第一版先做基础能力
- `asset.json` / `ports.json` 改成数据库表形式管理
- 支持未来设备绑定和数据绑定扩展

## 目标

本轮设计的目标是建立一个基础版资产中心，完成“模型上传占位 + 资产配置编辑 + 发布到设备库”的 Web 化闭环：

1. 新增独立页面 `/assets`
2. 支持资产完整 CRUD：
   - 新增
   - 编辑
   - 发布
   - 下线
   - 删除
3. 模型文件通过后端上传接口保存到“对象存储适配层”
4. 资产基础信息和端口配置落数据库表
5. 支持两种端口编辑方式：
   - 表格表单
   - 原始 JSON 高级模式
6. 预留未来设备绑定 / 数据绑定扩展区
7. 已发布资产继续通过现有 `/api/equipment/*` 接口供编排页消费

## 非目标

本轮不包含：

- 直接接入真实 OSS 云厂商
- 复杂审批流
- 批量导入 ZIP/文件夹
- 端口三维拖拽可视化编辑
- 真正连通设备绑定或实时数据绑定
- 多租户权限体系

## 总体方案

### 推荐架构

资产中心拆成两部分：

1. **文件层**
   - 只负责模型文件上传与访问
   - 第一版使用“本地对象存储适配层”
   - 对前端暴露的语义与未来 OSS 保持一致

2. **配置层**
   - 使用数据库表管理：
     - 资产主信息
     - 端口配置
     - 绑定占位信息
     - 发布版本
   - 所有后台编辑动作都在这里完成

### 核心原则

- 二进制模型文件不进数据库
- 结构化配置不再直接存成 `asset.json` / `ports.json`
- 设备库只消费“已发布”资产
- 草稿资产不直接进入编排页

## 数据模型

### 1. `equipment_assets`

资产主表。

字段建议：

- `id`
- `asset_key`
- `display_name`
- `type`
- `default_system`
- `asset_version`
- `render_style`
- `bounds_x`
- `bounds_y`
- `bounds_z`
- `model_url`
- `status`：`draft | published | archived`
- `created_at`
- `updated_at`

语义：

- `asset_key` 作为稳定的业务键，对应原先 `assetId`
- `status` 控制是否能被设备库消费
- `model_url` 指向上传后的模型访问地址

### 2. `equipment_ports`

端口配置表。

字段建议：

- `id`
- `asset_id`
- `port_key`
- `name`
- `position_x`
- `position_y`
- `position_z`
- `system`
- `direction`
- `sort_order`

语义：

- 一行对应一个端口
- 足够支持表格编辑、排序、校验与 JSON 导入导出

### 3. `equipment_bindings`

未来扩展用的绑定占位表。

字段建议：

- `id`
- `asset_id`
- `binding_type`
- `binding_key`
- `binding_value`
- `note`

第一版建议支持的 `binding_type`：

- `device_identity`
- `point_mapping`
- `runtime_field`

语义：

- 先作为结构化占位，不强制接真实外部系统
- 后续设备绑定、点位绑定、数据绑定都可以往这张表扩展

### 4. `equipment_asset_versions`

发布版本表。

字段建议：

- `id`
- `asset_id`
- `version_no`
- `snapshot_json`
- `published_at`
- `published_by`

语义：

- 每次发布时把当前资产完整快照存入 `snapshot_json`
- 用于回溯和未来版本对比

### 5. `equipment_uploads`

文件上传表。

字段建议：

- `id`
- `asset_id`（可空）
- `file_name`
- `storage_key`
- `public_url`
- `mime_type`
- `size_bytes`
- `upload_status`
- `created_at`

语义：

- 支持“先上传文件，再创建/编辑资产”
- `asset_id` 可在资产尚未创建时为空

## 存储策略

### 第一版

模型文件先不接真实 OSS，而是实现一个“对象存储适配层”：

- 上传接口保存到后端受控目录，例如：
  - `apps/mock-api/storage/assets/<upload-id>/model.glb`
- 对前端返回：
  - `public_url`
  - `storage_key`

这样第一版就可以模拟真实对象存储使用方式，后续只替换适配层，不需要推翻页面与接口。

### 后续切 OSS

后续接 OSS 时，仅替换：

- 上传实现
- `public_url` 生成逻辑
- 可选的签名下载策略

数据库与前端表单结构都不需要重写。

## 页面设计

### 新页面：`/assets`

定位：后台资产管理中心。

建议采用三栏布局：

1. **左侧：资产列表**
   - 支持按状态筛选：`draft / published / archived / all`
   - 显示资产名称、业务键、状态、更新时间
   - 提供“新建资产”入口

2. **中间：资产编辑区**
   - 基础信息表单
   - 端口配置区
   - 绑定占位配置区
   - 发布操作区

3. **右侧：模型与校验区**
   - 当前模型文件信息
   - 上传模型
   - 轻量预览占位
   - 配置校验结果

### 页面结构细分

#### A. 资产列表区

每个条目展示：

- `display_name`
- `asset_key`
- `status`
- `updated_at`

条目操作：

- 选中查看/编辑
- 删除（仅 `draft` 或未引用资产，具体限制可在实现阶段决定）

#### B. 基础信息区

字段建议：

- 资产名称
- 业务键 `asset_key`
- 类型 `type`
- 默认系统 `default_system`
- 渲染风格 `render_style`
- 包围盒尺寸 `bounds_x/y/z`

#### C. 端口配置区

支持双模式：

1. 表格模式
   - 每行编辑一个端口
   - 可新增、删除、排序

2. JSON 高级模式
   - 原始编辑 `ports[]`
   - 用于高级用户快速粘贴/批量修改

两者需要共享同一套校验结果。

#### D. 绑定占位区

第一版只做结构输入，不做外部联调。

推荐展示为 3 个分组：

- 设备标识绑定
- 点位映射绑定
- 运行字段绑定

每组可新增键值项。

#### E. 模型文件区

支持：

- 上传 `model.glb`
- 查看当前上传状态
- 显示模型 URL / storage key
- 更换模型文件

第一版不要求复杂预览器，但建议预留一个模型预览占位区，后续可挂只读 three 预览。

#### F. 发布区

操作包括：

- 保存草稿
- 发布
- 下线
- 删除

状态规则：

- `draft`：可编辑、可发布、可删除
- `published`：可编辑后再发布新版本，可下线，不建议直接删除
- `archived`：可恢复或删除（具体策略实现阶段决定）

## 用户流程

### 新增资产

1. 进入 `/assets`
2. 点击“新建资产”
3. 上传模型文件
4. 填写基础配置
5. 配置端口
6. 配置绑定占位信息
7. 保存草稿
8. 点击发布

### 编辑资产

1. 从资产列表选中一个资产
2. 修改基础信息 / 端口 / 绑定配置
3. 保存草稿
4. 需要生效时点击发布

### 删除资产

1. 在资产列表中选中资产
2. 点击删除
3. 后端校验是否允许删除
4. 删除成功后从列表移除

## API 设计

### 资产管理接口

- `GET /api/assets`
  - 返回资产列表
  - 支持 `status` 过滤

- `POST /api/assets`
  - 新建资产草稿

- `GET /api/assets/:assetId`
  - 返回资产详情

- `PUT /api/assets/:assetId`
  - 更新基础信息

- `PUT /api/assets/:assetId/ports`
  - 全量更新端口配置

- `PUT /api/assets/:assetId/bindings`
  - 全量更新绑定占位配置

- `POST /api/assets/uploads`
  - 上传模型文件
  - 返回 `storage_key`、`public_url`

- `POST /api/assets/:assetId/publish`
  - 发布资产
  - 写入版本快照

- `POST /api/assets/:assetId/archive`
  - 下线资产

- `DELETE /api/assets/:assetId`
  - 删除资产

- `GET /api/assets/:assetId/versions`
  - 获取版本历史

### 设备库消费接口

保留现有：

- `GET /api/equipment/catalog`
- `GET /api/equipment/:assetId`
- `GET /api/equipment/:assetId/ports`

但语义改为：

- 只从 `published` 资产生成输出
- 输出格式继续兼容前端当前 `loadEquipmentCatalog()` 逻辑

这样编排页和总览页不需要同时跟着大改。

## 与现有代码的关系

### 前端

当前 `DevicePalette` 有本地导入逻辑：

- `导入 catalog.json`
- `导入资产包（文件夹）`

这两条链路在新资产中心完成后，建议逐步降级为开发辅助能力，而不是主业务入口。

中期目标：

- 编排页设备库默认只消费后端已发布资产
- 资产新增和编辑统一到 `/assets`

### 后端

当前 `mock-api` 的 `equipment` 路由直接读文件：

- `catalog.json`
- `asset.json`
- `ports.json`

新设计下建议分层：

1. `/api/assets/*`
   - 面向后台管理
   - 读数据库 + 存储适配层

2. `/api/equipment/*`
   - 面向运行前台/编排前台
   - 只输出已发布资产

## 验证与校验

### 表单校验

基础字段至少校验：

- `asset_key` 非空且唯一
- `display_name` 非空
- `bounds_x/y/z` 为正数

端口字段至少校验：

- `port_key` 非空且同一资产内唯一
- 坐标为数字
- `direction` 合法
- `system` 非空

### 发布前校验

发布前至少检查：

- 已上传模型文件或明确允许无模型占位资产
- 基础配置完整
- 端口配置合法
- `asset_key` 唯一

## 风险

### 风险 1：资产管理和设备库消费同时切换，容易把前端全链路打断

处理：

- 保持 `/api/equipment/*` 输出合同稳定
- 新增 `/api/assets/*` 独立后台接口

### 风险 2：第一版直接接真实 OSS，开发和联调成本过高

处理：

- 第一版先实现本地对象存储适配层
- 保留未来替换 OSS 的接口边界

### 风险 3：端口双编辑模式容易出现状态不同步

处理：

- 统一内部数据模型
- 表格模式和 JSON 模式共享同一份状态与校验结果

### 风险 4：删除已发布资产可能影响场景编排和已保存场景

处理：

- 删除前做状态与引用检查
- 第一版可先限制“已发布资产只能下线，不能直接删除”

## 验收标准

满足以下条件即可认为本轮基础资产中心完成：

1. `/assets` 可访问
2. 可新增资产草稿
3. 可上传 `model.glb`
4. 可编辑基础配置
5. 可用表格和 JSON 两种方式编辑端口
6. 可编辑绑定占位信息
7. 可发布、下线、删除
8. 编排页设备库仍可正常读取已发布资产
9. 前后端测试、lint、build 通过
