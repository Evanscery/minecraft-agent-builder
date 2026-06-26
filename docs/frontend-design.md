# 前端设计文档（mcAgentBuilder）

本文件是前端实现的设计基线。目标是：在「约束优先」的后端契约之上，构建一个**富交互、强交互、现代、极其精美**的 Minecraft 蓝图工作台，符合用户从「描述需求 → 查看 3D 预览 → 检查错误 → 局部重试 / 手动编辑 → 导出」的真实使用逻辑。

前端严格只依赖稳定的数据接口（见 `docs/plan.md` 第 11 章），不绑定任何具体 LLM、后端语言或导出格式实现。

---

## 1. 设计目标

| 维度 | 目标 |
|------|------|
| 交互 | 富交互、强交互：3D 拖拽旋转 / 滚轮缩放 / 平移 / 点击选块 / 选 region / 框选 / 键盘快捷键 |
| 视觉 | 现代、精致：深色玻璃拟态、清晰层级、高对比、动效克制但顺滑 |
| 逻辑 | 贴合使用流：左侧结构 → 中央 3D → 右侧检视 + 操作；状态驱动 |
| 解耦 | 只依赖 `ProjectState / Preview / Validation / Retry / Patch / Export` API |
| 性能 | 大量体素时仍流畅：实例化渲染、按需刷新、区块分桶 |

---

## 2. 信息架构与布局

三栏工作台 + 顶栏，响应式塌缩。

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar: 项目名 · 主题 · 模式 · 视图模式切换 · 重置 · 导出     │
├───────────────┬─────────────────────────────┬───────────────┤
│  左栏 (320px) │   中央 3D 预览 (flex)         │  右栏 (360px) │
│               │                              │               │
│  Region 树    │   VoxelCanvas (Three.js)     │  Inspector    │
│  Material 面板│   · 坐标轴 / 网格 / region 边界 │   选中块/区域 │
│  Validation   │   · 浮层工具条（视角/分层/X光）│   Retry 表单  │
│  列表          │   · 选中高亮 / 错误高亮        │   Manual Edit │
│               │   · 框选临时区域              │   Export 面板 │
│               │                              │   命令历史     │
└───────────────┴─────────────────────────────┴───────────────┘
```

- 左栏：结构总览与错误入口，点击 region / 错误项都会联动中央 3D。
- 中央：主操作区，所有空间交互发生在这里。
- 右栏：上下文检视与动作面板，随当前选中对象变化。

---

## 3. 状态模型（前端）

单一 `projectStore` 持有完整状态，所有面板订阅派生值。

```ts
type ViewMode = 'full' | 'region' | 'layer' | 'material' | 'interface' | 'error';
type Tool = 'select' | 'inspect' | 'paint' | 'erase' | 'box';

interface ProjectState {
  projectId: string;
  spec: ProjectSpec;              // 元信息 / regions / interfaces / palette
  materials: MaterialRecord[];
  preview: PreviewData;           // blocks / regions / interfaces / errors
  validation: ValidationReport;
  retryHistory: RetryRequest[];
  manualPatchHistory: ManualPatchRequest[];
  // UI 状态
  selectedRegionId: string | null;
  selectedBlock: { x, y, z } | null;
  boxSelection: Box | null;
  viewMode: ViewMode;
  tool: Tool;
  layerY: number;                 // 分层视图当前层
  showRegionBoundary: boolean;
  showInterfaces: boolean;
  showErrors: boolean;
  xray: boolean;
  busy: boolean;                  // 全局请求中
  toast: { kind, message } | null;
}
```

刷新策略：`manual-patch` / `retry-region` / `export` 成功后**自动重拉** `GET /projects/{id}` + `/preview` + `/validation`，保持三栏与 3D 同步。

### 交互模式（核心：解决左键拖拽与选块冲突）
- **view 模式（默认）**：左键拖拽旋转、右键拖拽平移、滚轮缩放，**不会选块**，避免误触。
- **edit 模式**：左键点击选块 / paint / erase；按 click-vs-drag 判定（位移 < 5px 才算点击），拖拽不触发选块，避免相机微动选中错误方块。
- 切换：`Tab`，或顶栏 / EditPanel 的 View/Edit 按钮；工具快捷键（V/B/E/R）自动进入 edit。
- 光标随模式变化：view=grab/grabbing，edit=crosshair。

---

## 4. 中央 3D 预览（VoxelCanvas）

### 4.1 渲染
- Three.js + `InstancedMesh`：每个 block 一个实例，按材料分组以减少 draw call。
- 每个实例携带 `region`，支持按 region / material / layer 过滤显隐。
- **真实 Minecraft 纹理**：从 PrismarineJS minecraft-assets（`data/1.20.2/blocks/<name>.png`）加载，缓存 + 失败回退到程序化占位色。
- **不完整方块**：`bounding_box === "empty"`（火把、灯笼、玻璃板）以更小的居中立方体（0.35³，贴地 0.18）渲染，不再占满体素。

### 4.2 相机与控制
- `OrbitControls`：左键旋转、右键平移、滚轮缩放。
- 调优手感：`dampingFactor 0.08`、`rotateSpeed 0.8`、`zoomSpeed 0.9`、`panSpeed 0.8`，设 `min/max distance` 防止拖远后难以拉回。
- 预设视角按钮：等距 / 正面 / 侧面 / 顶视图。
- **一键复位**：顶栏 `⟳ Reset`（快捷键 `Home`），围绕整个 build 居中并设定安全相机距离，解决拖远后难以拖回。
- 区域边界与方块都按 `project.origin` 投影，边界框与实际方块对齐。
- 双击空白处重置相机。

### 4.3 选择与高亮
- 点击 block → 命中实例 → 写入 `selectedBlock`，右侧 Inspector 联动。
- 点击 region 边界盒 → 选中 region，3D 中高亮该 region 边框。
- 选中块以发光描边（OutlinePass 或 emissive）突出。

### 4.4 视图模式
- `full`：全部显示。
- `region`：仅显示选中 region，其余半透明。
- `layer`：仅显示 `layerY` 这一层（切片）。
- `material`：仅高亮选中材料类型。
- `interface`：高亮接口位置（门洞 / 墙连接）。
- `error`：高亮 validation 报错的坐标。

### 4.5 工具
- `select`：默认，点选。
- `inspect`：悬停显示块信息 tooltip。
- `paint`：选材料后点击方块替换（提交 manual patch `set_block`）。
- `erase`：点击删除（提交 manual patch `remove_block`）。
- `box`：框选临时区域，供后续划区重试。

### 4.6 性能
- 预览块超过 `max_render_blocks` 时启用 LOD / 降采样并提示。
- 区块按 16³ 分桶，视锥剔除。

---

## 5. 左栏面板

### 5.1 Region 树
- 列出所有 region，显示 id / role / 方块数。
- 点击 → 选中 region 并相机聚焦其包围盒。
- 显示该 region 的接口数量角标。

### 5.2 Material 面板
- 按 slot（wall/roof/floor/glass/light/air）分组。
- 每项显示色块、名称、availability。
- `paint` 工具激活时，点击材料即设为当前画笔。

### 5.3 Validation 列表
- 分组展示错误（material_violation / wall_gap / missing_gate / merge_conflict / out_of_region）。
- 每项可点击 → 3D 聚焦相关坐标 / region。
- 严重度颜色编码。

---

## 6. 右栏 Inspector 与动作面板

### 6.1 Inspector
- 选中块：显示坐标、block、所属 region、texture 路径。
- 选中 region：显示 box、role、constraints、相关 interfaces。

### 6.2 Retry 面板
- 目标 region 自动填充当前选中。
- 多行指令输入 + preserve 选项。
- 提交 → 调 `retry-region` → 刷新 → toast 提示。

### 6.3 Manual Edit
- 画笔模式：选材料 + 工具（paint/erase）。
- 提交即调 `manual-patch`，3D 实时反映新方块。
- 显示本次 applied_ops / 被拒数。

### 6.4 Export 面板
- 格式选择（json / mcfunction）。
- 导出后在面板内预览内容，并提供「复制 / 下载」。

### 6.5 命令历史
- 时间线展示 retry / patch 记录，可展开查看详情。

---

## 7. 交互逻辑与快捷键

| 快捷键 | 作用 |
|--------|------|
| `Tab` | 切换 view / edit 交互模式 |
| `1`–`6` | 切换视图模式 |
| `V` | select（并进入 edit） |
| `B` | 画笔 paint（并进入 edit） |
| `E` | 橡皮 erase（并进入 edit） |
| `R` | 框选 box（并进入 edit） |
| `Home` | 一键复位相机 |
| `Shift+↑` / `Shift+↓` | 分层视图上 / 下一层 |
| `X` | 切换 X 光 |
| `Esc` | 清除选择 |

所有操作都有可视状态反馈：按钮高亮、光标变化、toast、3D 高亮。

---

## 8. 视觉设计规范

- 主色：深蓝灰 `#0f1623` 背景，玻璃面板 `rgba(17,24,39,.9)`，强调蓝 `#3b82f6`，成功绿 `#34d399`，警告 `#f59e0b`，错误 `#f87171`。
- 圆角 14px，面板阴影柔和，1px 半透明描边。
- 字体：Inter，等宽用 JetBrains Mono（坐标 / 代码）。
- 动效：面板入场淡入上移，选中描边脉冲，toast 滑入；过渡 160–220ms ease-out。
- 布局留白充足，信息密度适中，强调「中央 3D 是主角」。

---

## 9. 与后端的契约

前端只调用以下稳定接口：

```
GET    /health
GET    /materials
POST   /projects/sample
GET    /projects/{id}
GET    /projects/{id}/preview
GET    /projects/{id}/validation
POST   /projects/{id}/retry-region
POST   /projects/{id}/manual-patch
POST   /projects/{id}/export
```

任何写操作成功后，前端自动刷新项目快照，保证 UI 与后端一致。

---

## 10. 实现分期

1. **骨架**：状态管理、API client、三栏布局、顶栏。
2. **3D 核心**：Three.js 体素渲染 + 选择 + 相机预设。
3. **面板联动**：Region/Material/Validation 与 3D 双向联动。
4. **编辑闭环**：paint/erase → manual-patch → 自动刷新。
5. **Retry / Export**：表单提交 + 结果展示 + 历史时间线。
6. **打磨**：动效、快捷键、空状态、错误态、响应式。

后续可在不破坏契约的前提下替换 3D 引擎或接入真实 Region Agent。
