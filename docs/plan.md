# AI Minecraft Blueprint Generator 项目目标与整体计划

## 1. 项目目标

本项目目标是构建一个 **AI 驱动的 Minecraft 建筑蓝图生成系统**。

用户通过自然语言描述建筑需求，例如：

“生成一个中世纪城堡，包含主堡、城墙、四角塔、门楼、庭院和内部房间，要求生存模式可建造。”

系统最终输出可用于 Minecraft 的建筑蓝图，例如：

* mcfunction 命令文件
* schematic / litematic 文件
* 分层蓝图
* 方块坐标表
* 可视化预览数据
* 可交互编辑的项目文件

项目的核心目标不是让 AI 给出文字建议，也不是做建筑策划助手，而是让 AI 参与生成真正可执行、可预览、可编辑、可局部重试、可导出的 Minecraft 建筑结构。

---

## 2. 核心问题

Minecraft 中大型建筑可能包含数万到数十万个方块。

如果让单个 AI 一次性输出完整方块坐标，会遇到：

* token 数量爆炸
* 坐标容易错乱
* 大结构难以保持整体一致性
* 出错后难以定位和修复
* 单次生成失败成本过高

如果完全依赖手写建筑模板，例如 house、tower、castle、roof 等 generator，那么 AI 只是在填参数，项目会退化成普通程序化生成器，AI 的价值会降低。

因此，本项目采用中间路线：

**AI 不一次性生成整个建筑，而是先进行全局区域拆分，再由多个子代理分别生成局部蓝图，最后由程序进行合并、验证、预览、交互修改和局部重试。**

---

## 3. 总体方案

整体流程：

```text
User Prompt
→ Global Planner
→ Material Planner
→ Region Specs
→ Region Generator Agents
→ Merger
→ Validator
→ Interactive Preview
→ Region Retry / Manual Edit / Visual Calibration
→ Exporter
→ Minecraft Blueprint
```

主要模块：

* **Global Planner**：负责全局布局、区域拆分、接口约束
* **Material Planner**：根据用户目标和材料数据库选择本次可用材料集合
* **Region Generator Agents**：负责各自区域内的局部蓝图生成
* **Merger**：负责统一坐标、合并所有区域
* **Validator**：负责检查边界、冲突、接口、超界、材料违规等硬错误
* **Frontend Preview**：负责 Minecraft 材质渲染、拖拽查看、区域选择、局部重试
* **Retry / Repair Agent**：负责根据用户反馈或验证报告重生成局部区域
* **Exporter**：负责导出 Minecraft 可用格式

---

## 4. 系统核心思想

### 4.1 区域拆分

系统首先把大型建筑拆成多个空间区域。

例如一个 96 × 96 × 64 的中世纪城堡，可以拆成 3 × 3 个区域：

```text
R1 R2 R3
R4 R5 R6
R7 R8 R9
```

每个区域有独立空间边界，例如：

* R1：西北塔与北墙
* R2：北侧城墙
* R3：东北塔与北墙
* R4：西侧城墙与侧房
* R5：中庭
* R6：东侧城墙与侧房
* R7：西南塔与南墙
* R8：南侧门楼
* R9：东南塔与南墙

每个区域只负责自己盒子内部的结构，不能越界。

---

### 4.2 区域协议

为了让多个区域能够拼接成完整建筑，每个区域必须带有接口约束。

接口约束描述：

* 哪一侧需要连接墙体
* 哪个位置必须有门洞
* 哪个位置必须保留通道
* 哪些边界必须闭合
* 高度范围是多少
* 材料风格必须保持一致

示例：

```yaml
interfaces:
  - between: [R5, R8]
    type: main_gate
    position:
      x: [44, 52]
      y: [0, 6]
      z: 64
    rule: "R8 must create a gate opening aligned with the courtyard path."

  - between: [R1, R2]
    type: wall_connection
    position:
      x: 32
      y: [0, 14]
      z: [8, 24]
    rule: "Walls must connect without gaps."
```

区域协议是整个系统的关键。它保证各个子区域不是孤立生成，而是在统一约束下生成。

---

## 5. 材料系统

Minecraft 可放置方块数量很多，其中有些适合生存模式，有些在生存模式下不可获得，有些虽然可获得但成本很高。

因此系统需要维护一个材料列表数据库，作为 AI 生成蓝图时的材料约束来源。

初期可以使用 CSV 实现材料数据库。CSV 足够简单、易维护、易导入、易筛选。默认数据来源可以从 Minecraft Wiki 或其他可靠资料整理原版可放置方块信息，后续再支持自动或半自动更新。

---

### 5.1 材料数据结构

每个方块材料记录包含：

```yaml
id: minecraft:oak_planks
name: Oak Planks
description: yellow oak wood, easy to obtain, suitable for survival building
category: wood
availability: 5
visual_style: warm, natural, medieval-compatible
texture_path: textures/block/oak_planks.png
```

其中 `availability` 表示生存模式获取难度：

```text
-1 = 生存模式不可获得
1  = 生存模式极难获得
2  = 生存模式较难获得
3  = 生存模式中等难度
4  = 生存模式较容易获得
5  = 生存模式非常容易获得
```

示例：

```yaml
materials:
  - id: minecraft:oak_planks
    name: Oak Planks
    description: yellow oak wood, easy to obtain
    category: wood
    availability: 5
    visual_style: warm, natural, medieval-compatible
    texture_path: textures/block/oak_planks.png

  - id: minecraft:spruce_planks
    name: Spruce Planks
    description: dark brown wood, easy to obtain, good for medieval roofs
    category: wood
    availability: 5
    visual_style: dark, wooden, medieval-compatible
    texture_path: textures/block/spruce_planks.png

  - id: minecraft:stone_bricks
    name: Stone Bricks
    description: gray stone block, moderately easy to obtain, good for castles
    category: stone
    availability: 4
    visual_style: gray, medieval, durable
    texture_path: textures/block/stone_bricks.png

  - id: minecraft:quartz_block
    name: Block of Quartz
    description: clean white block, expensive in survival, good for modern buildings
    category: stone
    availability: 2
    visual_style: clean, white, modern
    texture_path: textures/block/quartz_block_side.png

  - id: minecraft:command_block
    name: Command Block
    description: unavailable in normal survival, not suitable for survival builds
    category: special
    availability: -1
    visual_style: technical, special, command-only
    texture_path: textures/block/command_block_front.png
```

---

### 5.2 CSV 材料数据库

示例字段：

```csv
id,name,description,category,availability,visual_style,texture_path,source,version
minecraft:oak_planks,Oak Planks,"yellow oak wood, easy to obtain",wood,5,"warm,natural,medieval-compatible",textures/block/oak_planks.png,minecraft_wiki,vanilla
minecraft:stone_bricks,Stone Bricks,"gray stone block, good for castles",stone,4,"gray,medieval,durable",textures/block/stone_bricks.png,minecraft_wiki,vanilla
minecraft:quartz_block,Block of Quartz,"clean white block, expensive in survival",stone,2,"white,clean,modern",textures/block/quartz_block_side.png,minecraft_wiki,vanilla
minecraft:command_block,Command Block,"unavailable in normal survival",special,-1,"technical,special",textures/block/command_block_front.png,minecraft_wiki,vanilla
```

推荐字段：

```text
id              Minecraft 方块 ID，例如 minecraft:stone_bricks
name            显示名称
description     简短描述，供 AI 理解材料用途
category        材料类别，例如 wood / stone / glass / light / metal / plant / special
availability    生存可获得性，-1 表示不可得，1-5 越大越容易获得
visual_style    视觉风格标签，例如 medieval / modern / warm / dark / natural
texture_path    前端预览使用的材质路径
source          数据来源，例如 minecraft_wiki / mod_import / manual
version         vanilla 或 mod 名称 / Minecraft 版本
```

后续如果材料数量、材质包、mod 元数据明显变多，可以迁移到 SQLite，但初期 CSV 足够。

---

### 5.3 材料规划器

Material Planner 根据用户目标选择本次项目允许使用的材料集合。

例如用户要求：

“生成一个生存模式可建造的中世纪城堡。”

Material Planner 应从材料数据库中筛选：

```text
availability >= 3
category 适合建筑
visual_style 包含 medieval / stone / wood / natural
排除 availability = -1 的方块
```

示例输出：

```yaml
active_palette:
  wall:
    - minecraft:stone_bricks
    - minecraft:cobblestone
    - minecraft:mossy_cobblestone
  roof:
    - minecraft:spruce_planks
    - minecraft:spruce_stairs
    - minecraft:dark_oak_planks
  floor:
    - minecraft:spruce_planks
    - minecraft:oak_planks
  window:
    - minecraft:glass_pane
  light:
    - minecraft:torch
    - minecraft:lantern
```

其他 sub-agent 只能看到这份 `active_palette`，不能自由使用完整 Minecraft 方块库。

这样可以保证：

* 用户要求生存可建时，不会生成生存不可获得材料
* 用户要求低成本时，可以优先选择 `availability >= 4` 的材料
* 用户要求豪华建筑时，可以允许 `availability = 1~3` 的稀有材料
* 风格保持统一
* 子区域之间材料一致
* Validator 可以检测材料违规
* 前端材料替换和筛选更简单

---

### 5.4 材料约束示例

不同用户目标对应不同筛选策略：

```yaml
survival_friendly:
  availability_min: 3
  allow_unavailable: false

low_cost_survival:
  availability_min: 4
  allow_unavailable: false

creative_showcase:
  availability_min: -1
  allow_unavailable: true

rare_luxury_survival:
  availability_min: 1
  allow_unavailable: false
```

例如：

* 生存友好建筑：只允许 `availability >= 3`
* 低成本生存建筑：只允许 `availability >= 4`
* 创造模式展示建筑：允许 `availability = -1`
* 豪华生存建筑：允许 `availability >= 1`，但仍排除 `availability = -1`

---

### 5.5 中期目标：mod 材料导入

中期系统需要支持 mod 数据导入材料列表数据库。

目标是让用户导入 mod 方块后，系统可以：

* 将 mod 方块加入材料数据库
* 识别 mod 方块 ID
* 读取或指定材质路径
* 标注 mod 来源
* 在 Material Planner 中参与材料筛选
* 在前端预览中正确显示材质
* 在导出蓝图时保留 mod 方块 ID

mod 材料导入后的记录示例：

```yaml
id: biomesoplenty:willow_planks
name: Willow Planks
description: greenish wooden plank from Biomes O' Plenty, decorative natural wood
category: wood
availability: 3
visual_style: green, natural, fantasy, wood
texture_path: mods/biomesoplenty/textures/block/willow_planks.png
source: mod_import
version: biomesoplenty
```

中期前端也需要支持 mod 材质渲染：

* 原版材质从默认资源包读取
* mod 材质从用户导入资源路径读取
* 缺失材质时显示占位纹理
* 材质路径写入材料数据库
* 用户可以在材料管理界面修改 `description`、`category`、`availability`、`visual_style`

这样系统不只支持原版 Minecraft，也可以扩展到用户自己的 modpack 建筑生成。

---

## 6. 全局规划器

Global Planner 接收用户自然语言需求，输出全局建筑规格。

它不生成方块，只生成结构化任务书。

示例输出：

```yaml
project:
  name: medieval_castle
  size: [96, 64, 96]
  origin: [0, 64, 0]
  theme: medieval_castle
  build_mode: survival_friendly

active_palette:
  wall:
    - minecraft:stone_bricks
    - minecraft:cobblestone
  roof:
    - minecraft:spruce_planks
    - minecraft:spruce_stairs
  floor:
    - minecraft:spruce_planks
  glass:
    - minecraft:glass_pane
  light:
    - minecraft:torch
    - minecraft:lantern
  air:
    - minecraft:air

regions:
  - id: R1
    box: [0, 0, 0, 32, 64, 32]
    role: northwest_tower_and_wall

  - id: R2
    box: [32, 0, 0, 64, 64, 32]
    role: north_wall

  - id: R3
    box: [64, 0, 0, 96, 64, 32]
    role: northeast_tower_and_wall

  - id: R4
    box: [0, 0, 32, 32, 64, 64]
    role: west_wall_and_side_room

  - id: R5
    box: [32, 0, 32, 64, 64, 64]
    role: courtyard

  - id: R6
    box: [64, 0, 32, 96, 64, 64]
    role: east_wall_and_side_room

  - id: R7
    box: [0, 0, 64, 32, 64, 96]
    role: southwest_tower_and_wall

  - id: R8
    box: [32, 0, 64, 64, 64, 96]
    role: south_gatehouse

  - id: R9
    box: [64, 0, 64, 96, 64, 96]
    role: southeast_tower_and_wall
```

Global Planner 的重点是确定：

* 总尺寸
* 区域切分
* 区域角色
* 统一材料集合
* 区域之间的接口
* 用户目标，例如生存可建、创造模式展示、低成本、豪华装饰等

---

## 7. 局部生成器

每个 Region Generator Agent 只接收自己的区域任务。

输入包括：

* region id
* region box
* region role
* active palette
* relevant interfaces
* style constraints
* 用户对该区域的局部修改要求

输出为局部蓝图。

局部蓝图可以包含两种表示。

### 7.1 压缩操作

优先使用压缩操作减少 token：

```yaml
region_id: R8
ops:
  - fill:
      from: [0, 0, 0]
      to: [31, 2, 31]
      block: minecraft:stone_bricks

  - fill:
      from: [0, 3, 0]
      to: [31, 18, 31]
      block: minecraft:stone_bricks

  - fill:
      from: [12, 3, 0]
      to: [19, 10, 31]
      block: minecraft:air
```

### 7.2 局部方块列表

对于细节部分，可以允许输出局部 blocks：

```yaml
blocks:
  - [1, 0, 1, minecraft:stone_bricks]
  - [2, 0, 1, minecraft:stone_bricks]
  - [3, 0, 1, minecraft:spruce_planks]
```

坐标必须是局部坐标，而不是全局坐标。

全局坐标由合并器计算：

```text
global_x = region_origin_x + local_x
global_y = project_origin_y + local_y
global_z = region_origin_z + local_z
```

---

## 8. 合并器

Merger 是程序模块，不由 AI 完成。

它负责：

* 读取所有 region 输出
* 展开 ops
* 转换局部坐标到全局坐标
* 合并到 global block map
* 处理冲突
* 标记接口区域
* 保留 region 与方块之间的映射关系

保留 region 映射很重要，因为前端点击某一块区域时，需要知道它属于哪个 region，才能进行局部重试。

冲突处理规则：

* 区域外方块直接拒绝
* air 默认只能清除本区域内部
* interface 区域由接口规则保护
* structure 优先级高于 decoration
* patch 操作优先级高于初始生成操作
* 不允许使用 active_palette 之外的材料

最终得到：

```python
global_blocks = {
    (x, y, z): "minecraft:stone_bricks",
    ...
}

block_region_map = {
    (x, y, z): "R8",
    ...
}
```

---

## 9. 验证器

Validator 是程序模块，负责检查硬性错误。

主要检查：

* 方块是否超出 region
* 是否使用 active_palette 外材料
* 区域之间的墙是否连接
* 指定接口是否存在门洞
* 通道是否被堵住
* 是否有严重悬空结构
* 是否有未解决的坐标冲突
* 是否存在明显缺口
* 是否有创造模式限定方块混入生存模式项目

Validator 输出结构化错误报告：

```yaml
errors:
  - type: material_violation
    region: R3
    detail: "minecraft:quartz_block is not allowed in current survival-friendly palette."

  - type: missing_gate
    region: R8
    interface: R5_R8_main_gate
    detail: "Expected opening x=44..52, y=0..6, z=64, but stone blocks occupy the area."

  - type: wall_gap
    regions: [R1, R2]
    detail: "Wall connection at x=32, z=8..24, y=0..14 contains missing blocks."
```

错误报告必须短小，供 Repair Agent 或对应 Region Agent 使用。

---

## 10. 前端交互与 Minecraft 材质预览

项目需要一个丝滑前端，避免用户只能看 YAML 或命令文件。

前端核心目标是：

* 快速输入需求
* 实时查看生成进度
* 用 Minecraft 材质渲染建筑预览
* 支持拖拽、旋转、缩放、平移
* 支持区域选择和局部重试
* 支持材料查看和替换
* 支持手动编辑
* 支持导出蓝图

---

### 10.1 预览渲染

前端使用 Minecraft 材质进行体素渲染。

每个方块应显示对应材质，而不是简单纯色立方体。

预览能力包括：

* 3D 自由视角
* 正视图 / 侧视图 / 顶视图
* 分层查看
* 隐藏屋顶查看内部
* 显示 region 边界
* 高亮当前选中 region
* 高亮接口位置
* 显示材料统计
* 显示错误位置
* 显示手动编辑区域
* 显示 AI 重试历史

用户可以在前端直接看到建筑是否好看、比例是否合理、哪些区域需要重试。

---

### 10.2 拖拽与操作

前端支持：

* 鼠标拖拽旋转视角
* 滚轮缩放
* 中键或右键平移
* 点击选择方块
* 点击选择 region
* 框选区域
* 切换显示模式：整体 / region / layer / material / interface / error
* 局部隐藏
* 局部透明
* 局部锁定
* 选择区域后发起 AI 重试

---

## 11. 前端高可配置与高解耦约束

前端不能和某一种后端实现、某一种 AI provider、某一种导出格式、某一种材质来源强绑定。

前端应作为独立的可视化与交互层，通过稳定 API 与项目状态交互。

---

### 11.1 高可配置目标

前端应支持通过配置文件或设置面板调整：

* 默认渲染模式
* 默认材质包
* 默认可见图层
* region 边界显示样式
* interface 高亮开关
* error 高亮开关
* 选中区域高亮方式
* 相机控制方式
* 默认导出格式
* 默认材料筛选策略
* 是否显示调试信息
* 是否启用视觉校准模式
* 是否启用手动编辑模式
* 是否启用 mod 材质
* 是否启用高级 block metadata 显示

示例前端配置：

```yaml
frontend_config:
  renderer:
    texture_pack: vanilla_default
    show_region_boundary: true
    show_interfaces: true
    show_errors: true
    enable_layer_view: true
    enable_xray_view: true

  interaction:
    enable_region_select: true
    enable_block_select: true
    enable_box_select: true
    enable_manual_edit: true
    enable_region_retry: true

  preview:
    default_camera: isometric
    default_visibility_mode: full
    max_render_blocks: 200000
    chunk_render_size: 16

  materials:
    show_material_panel: true
    allow_material_replace: true
    allow_mod_texture: true

  export:
    default_format: litematic
    allow_mcfunction: true
    allow_schematic: true
    allow_json: true
```

---

### 11.2 高解耦目标

前端不应直接依赖：

* 某个具体 LLM API
* 某个具体 agent 框架
* 某个具体后端语言
* 某个具体蓝图生成算法
* 某个具体导出格式
* 某个固定材料库格式
* 某个固定 Minecraft 版本

前端只依赖稳定的数据接口：

```text
Project State API
Region API
Material API
Preview Data API
Retry API
Manual Edit API
Export API
Validation API
```

也就是说，前端只关心：

* 当前项目有哪些 region
* 每个 region 的 box 是什么
* 每个方块是什么材质
* 哪些地方有错误
* 用户选中了哪里
* 用户要对哪里发起重试
* 用户要导出什么格式

前端不关心后端到底是：

* Python
* TypeScript
* FastAPI
* Node.js
* 本地模型
* OpenAI
* Claude
* 多 agent 框架
* 单 agent 框架

---

### 11.3 前端与后端通信模型

前端通过项目状态进行通信，而不是直接操控底层生成器。

核心 API 示例：

```text
GET  /project/{project_id}
GET  /project/{project_id}/regions
GET  /project/{project_id}/materials
GET  /project/{project_id}/preview
GET  /project/{project_id}/validation

POST /project/{project_id}/retry-region
POST /project/{project_id}/retry-selection
POST /project/{project_id}/manual-patch
POST /project/{project_id}/replace-material
POST /project/{project_id}/visual-calibration
POST /project/{project_id}/export
```

前端发起局部重试时，只提交结构化请求：

```json
{
  "target_region": "R3",
  "user_instruction": "把这个烟囱改成哥特式，高一点，颜色保持和屋顶一致。",
  "preserve_interfaces": true,
  "preserve_manual_edits": true
}
```

后端负责把这个请求包装成 sub-agent 的上下文。

---

### 11.4 前端内部模块解耦

前端内部建议拆成以下模块：

```text
App Shell
Project Store
Renderer
Selection Manager
Material Panel
Region Panel
Validation Panel
Retry Panel
Manual Edit Tools
Export Panel
Settings Panel
```

各模块职责：

* **App Shell**：整体布局、页面导航
* **Project Store**：维护项目状态
* **Renderer**：只负责体素渲染
* **Selection Manager**：负责方块、region、框选区域的选择状态
* **Material Panel**：负责材料查看、筛选、替换
* **Region Panel**：负责区域信息展示
* **Validation Panel**：负责错误报告展示和跳转
* **Retry Panel**：负责局部重试输入与提交
* **Manual Edit Tools**：负责手动编辑操作
* **Export Panel**：负责导出格式选择
* **Settings Panel**：负责前端配置

Renderer 不应直接调用 AI。
Retry Panel 不应直接修改 block map。
Material Panel 不应直接写入导出文件。
所有写操作都通过后端 API 或统一 project store action 完成。

---

### 11.5 渲染器解耦

渲染器只接收标准化 preview data：

```json
{
  "blocks": [
    {
      "x": 0,
      "y": 64,
      "z": 0,
      "block": "minecraft:stone_bricks",
      "region": "R8",
      "texture": "textures/block/stone_bricks.png"
    }
  ],
  "regions": [
    {
      "id": "R8",
      "box": [32, 0, 64, 64, 64, 96],
      "role": "south_gatehouse"
    }
  ],
  "interfaces": [],
  "errors": []
}
```

渲染器不关心这些 blocks 是来自：

* AI 生成
* 用户手动编辑
* repair patch
* 文件导入
* mod 结构导入

这保证后续更换生成逻辑时，不需要重写前端渲染层。

---

## 12. 分块重试

分块重试是系统的重要交互能力。

用户在预览中如果觉得某一块不满意，可以直接点击对应 region，然后输入局部修改要求。

例如用户点击 R3，然后输入：

“把这个烟囱改成哥特式，高一点，颜色保持和屋顶一致。”

系统自动构造发送给 R3 sub-agent 的上下文：

```yaml
target_region: R3
user_instruction: "Make the chimney gothic-style, taller, and keep the color consistent with the roof."

region_context:
  id: R3
  box: [64, 0, 0, 96, 64, 32]
  role: northeast_tower_and_wall
  current_blueprint: previous_ops_or_summary
  active_palette:
    roof:
      - minecraft:spruce_planks
      - minecraft:spruce_stairs
    wall:
      - minecraft:stone_bricks
      - minecraft:cobblestone

neighbor_context:
  adjacent_regions:
    - R2
    - R6
  relevant_interfaces:
    - R2_R3_wall_connection
    - R3_R6_wall_connection

constraints:
  - do not exceed region boundary
  - preserve existing wall connection interfaces
  - use only active_palette
```

R3 sub-agent 只重写 R3 或生成 R3 patch，不影响其他区域。

这样用户可以通过前端不断局部重试，而不是每次重新生成整个建筑。

---

## 13. 手动编辑

中期需要支持手动编辑，使用户可以直接修改 AI 生成的结构。

手动编辑能力包括：

* 放置方块
* 删除方块
* 替换材料
* 复制区域
* 移动区域
* 镜像区域
* 拉伸区域
* 框选局部结构
* 保存编辑历史
* 撤销 / 重做

手动编辑产生的修改应记录为 edit patch，而不是直接覆盖原始数据。

示例：

```yaml
manual_patch:
  id: patch_0007
  target_region: R8
  ops:
    - fill:
        from: [14, 8, 2]
        to: [18, 12, 2]
        block: minecraft:glass_pane
  source: user_manual_edit
```

这样后续 AI 重试时，可以知道哪些部分是用户手动改过的，并尽量保留这些修改。

---

## 14. 划区重试

除了按已有 region 重试，中期还需要支持用户手动划定任意区域进行重试。

例如用户框选一块屋顶区域，然后输入：

“这块屋顶太平了，改成更陡的尖顶。”

系统将用户框选区域转换成 temporary region：

```yaml
temporary_region:
  id: user_selected_area_001
  box: [40, 20, 30, 58, 36, 48]
  user_instruction: "Make this roof steeper and more pointed."
  preserve_boundary: true
  allowed_to_modify_inside: true
  allowed_to_modify_outside: false
```

然后把这个临时区域交给局部生成器或修复器处理。

划区重试可以处理：

* 屋顶
* 烟囱
* 门楼
* 内饰
* 窗户
* 局部装饰
* 比例不协调的区域

---

## 15. 视觉校准模式

中期加入视觉校准模式。

系统从前端自动生成多视图截图，例如：

* 正面
* 背面
* 左侧
* 右侧
* 顶视图
* 斜俯视图
* 内部剖面视图

然后把这些截图发送给多模态 AI，让它从视觉角度提出修改建议。

多模态 AI 不直接改方块，而是输出结构化 critique：

```yaml
visual_feedback:
  - issue: "The main tower looks too short compared to the surrounding walls."
    target_region: R5
    suggestion: "Increase the central tower height by 8 blocks and add a steeper roof."

  - issue: "The front gate lacks visual emphasis."
    target_region: R8
    suggestion: "Add two vertical side pillars and a darker wooden arch above the gate."

  - issue: "The right side looks empty."
    target_region: R6
    suggestion: "Add windows, support beams, and a small balcony."
```

系统再把这些建议分发给对应 sub-agent：

* R5 sub-agent 修改主塔
* R8 sub-agent 修改门楼
* R6 sub-agent 修改右侧区域

这样可以形成：

```text
Preview
→ Screenshot
→ Multimodal Critique
→ Region-level Modification
→ Re-render Preview
```

的闭环。

---

## 16. 前端状态模型

前端需要维护完整项目状态，而不是只展示最终结果。

核心状态包括：

```yaml
project_state:
  user_prompt: string
  project_spec: object
  material_list: object
  active_palette: object
  regions: object
  region_blueprints: object
  global_blocks: object
  block_region_map: object
  validation_report: object
  edit_history: []
  retry_history: []
  preview_settings: object
```

其中：

* `region_blueprints` 用于局部重试
* `block_region_map` 用于点击方块或区域定位 sub-agent
* `edit_history` 用于撤销、重做、保护用户手动修改
* `retry_history` 用于记录每次 AI 局部修改
* `preview_settings` 保存相机角度、显示模式、分层状态

---

## 17. 导出器

Exporter 将最终 global block map 导出为 Minecraft 可用格式。

优先支持：

* mcfunction
* schematic
* litematic
* 分层蓝图图像
* JSON block map
* 项目工程文件

mcfunction 示例：

```mcfunction
setblock 0 64 0 minecraft:stone_bricks
setblock 1 64 0 minecraft:stone_bricks
setblock 2 64 0 minecraft:spruce_planks
```

后续也可以支持更高效的 fill 命令或 schematic 格式，以减少文件体积。

---

## 18. AI 与程序的分工

AI 负责：

* 理解自然语言需求
* 生成全局区域划分
* 根据用户目标选择材料范围
* 生成区域任务
* 生成局部方块蓝图
* 根据验证报告生成 patch
* 根据用户局部反馈重试指定区域
* 根据多视图截图提出视觉修改建议
* 将视觉建议分发给对应 sub-agent

程序负责：

* 材料数据库维护
* 坐标转换
* 方块展开
* 区域合并
* 冲突处理
* 规则验证
* Minecraft 材质渲染
* 前端交互
* 手动编辑记录
* 局部重试调度
* 文件导出

这种分工避免两个极端：

* 不让 AI 一次性输出整个大型建筑的所有方块
* 不把系统退化成手写大量建筑模板

AI 仍然参与建筑生成本身，但通过区域化、材料约束、预览反馈和局部重试控制复杂度。

---

## 19. 核心数据结构

### 19.1 Material Record

```yaml
id: minecraft:stone_bricks
name: Stone Bricks
description: gray stone block, moderately easy to obtain, good for castles
category: stone
availability: 4
visual_style: medieval, durable, gray
texture_path: textures/block/stone_bricks.png
source: minecraft_wiki
version: vanilla
```

### 19.2 Project Spec

```yaml
project:
  name: string
  size: [x, y, z]
  origin: [x, y, z]
  theme: string
  build_mode: survival_friendly | creative | decorative

active_palette:
  wall: [block_id]
  roof: [block_id]
  floor: [block_id]
  glass: [block_id]
  light: [block_id]
  air: [block_id]

regions:
  - id: string
    box: [x1, y1, z1, x2, y2, z2]
    role: string
    constraints: []

interfaces:
  - between: [region_id, region_id]
    type: string
    position: object
    rule: string
```

### 19.3 Region Blueprint

```yaml
region_id: string

ops:
  - fill:
      from: [x, y, z]
      to: [x, y, z]
      block: block_id

  - cut:
      from: [x, y, z]
      to: [x, y, z]

blocks:
  - [x, y, z, block_id]
```

### 19.4 Validation Report

```yaml
errors:
  - type: string
    region: string
    interface: string
    detail: string
```

### 19.5 Retry Request

```yaml
retry_request:
  target_region: R3
  user_instruction: string
  current_region_blueprint: object
  active_palette: object
  neighbor_context: object
  preserve_interfaces: true
  preserve_manual_edits: true
```

### 19.6 Manual Patch

```yaml
manual_patch:
  id: string
  target_region: string
  ops: []
  source: user_manual_edit
```

### 19.7 Visual Feedback

```yaml
visual_feedback:
  - issue: string
    target_region: string
    suggestion: string
```

### 19.8 Frontend Config

```yaml
frontend_config:
  renderer:
    texture_pack: string
    show_region_boundary: boolean
    show_interfaces: boolean
    show_errors: boolean
    enable_layer_view: boolean
    enable_xray_view: boolean

  interaction:
    enable_region_select: boolean
    enable_block_select: boolean
    enable_box_select: boolean
    enable_manual_edit: boolean
    enable_region_retry: boolean

  preview:
    default_camera: string
    default_visibility_mode: string
    max_render_blocks: number
    chunk_render_size: number

  materials:
    show_material_panel: boolean
    allow_material_replace: boolean
    allow_mod_texture: boolean

  export:
    default_format: string
    allow_mcfunction: boolean
    allow_schematic: boolean
    allow_litematic: boolean
    allow_json: boolean
```

---

## 20. 项目本质

本项目本质是：

**基于区域协议、材料约束和交互式预览的多代理 Minecraft 建筑蓝图生成系统。**

核心不是单个 AI 一次性生成巨大建筑，而是：

* 用全局规划控制整体结构
* 用材料规划控制可用方块
* 用区域任务拆分 token 压力
* 用局部生成实现方块级蓝图
* 用程序合并保持坐标一致
* 用验证器保证结构可用
* 用 Minecraft 材质前端提供可视化反馈
* 用区域重试和手动编辑提升可控性
* 用多视图视觉校准改进整体观感
* 用高可配置、高解耦前端保证后续扩展性

最终目标是让 AI 从自然语言生成可执行、可预览、可编辑、可反复局部优化的 Minecraft 建筑蓝图，同时避免 token 爆炸和纯手写模板化生成的问题。
