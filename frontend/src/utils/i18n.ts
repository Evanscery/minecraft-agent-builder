// 简体中文为默认语言。运行时可切换 zh/en。
type Dict = typeof zh;

const zh = {
  app: { name: 'mcAgentBuilder', subtitle: '约束优先的 Minecraft 蓝图生成工作台', loading: '正在加载项目状态…', loadFailed: '加载失败：' },
  topbar: { mode: '模式', view: '视图', edit: '编辑', camera: '相机', reset: '⟳ 复位', bounds: '边界', xray: '透视', blocks: '方块' },
  viewModes: { full: '整体', region: '区域', layer: '分层', material: '材质', interface: '接口', error: '错误' },
  paletteSlots: { wall: '墙体', roof: '屋顶', floor: '地板', glass: '玻璃', light: '光源', air: '空气', soil: '土壤', metal: '金属', plant: '植物', liquid: '液体', special: '特殊' },
  tools: {
    title: '编辑', select: '选择', paint: '绘制', erase: '擦除', build: '建造', box: '框选',
    viewHint: '视图模式 — 左键拖拽旋转、右键平移、滚轮缩放。按 Tab 切换到编辑。',
    paintHint: '画笔：', pickHint: '（从材料面板选取）', eraseHint: '点击方块以移除。',
    buildHint: '点击空位放置当前选中的材料。', boxHint: '拖拽以划定临时区域（重试功能开发中）。',
  },
  panels: {
    regions: '区域', palette: '调色板', validation: '校验', inspector: '检视器', block: '方块', region: '区域',
    box: '包围盒', interfaces: '接口', none: '无', noInterfaces: '无接口。', retry: '重试区域', export: '导出',
    history: '历史', target: '目标：', submitRetry: '提交重试', submitting: '提交中…',
    preserveInterfaces: '保留接口', preserveEdits: '保留手动编辑', exporting: '导出中…',
    copy: '复制', download: '下载', retryCount: '重试：', patchCount: '补丁：', selectHint: '选择区域或方块以检视。',
    coord: '坐标', blockField: '方块', regionField: '区域', texture: '贴图', id: 'ID', role: '角色',
  },
  validation: { allClear: '全部通过', issue: '问题', issues: '问题', noErrors: '无校验错误。' },
  toasts: {
    pickMaterialFirst: '请先选择材料。', retryRecorded: '重试请求已记录。', exported: '已导出 ',
    undone: '已撤销', nothingToUndo: '没有可撤销的操作', saved: '项目已保存', saveFailed: '保存失败',
    loaded: '项目已载入', loadFailed: '载入失败', projectCreated: '项目已创建',
  },
  bottombar: { void: '虚空', superflat: '超平坦', background: '背景', sky: '天空', day: '白昼', night: '夜晚' },
  newProject: {
    title: '新建项目', name: '项目名称', size: '尺寸 (X·Y·Z)', theme: '主题',
    buildMode: '建造模式', version: 'Minecraft 版本', baseFill: '初始地面（可选）', baseFillBlock: '地面方块',
    create: '创建', creating: '创建中…', loadSample: '载入示例项目',
    defaultName: '我的城堡',
  },
  settings: {
    close: '关闭 ✕', general: '通用', prompts: 'Agent 提示词', mods: 'Mod 资源', saves: '另存为',
    language: '语言', defaultVersion: '默认版本', defaultBuildMode: '默认建造模式',
    defaultExportFormat: '默认导出格式', maxRenderBlocks: '最大渲染方块数',
    showBounds: '显示区域边界', allowModTexture: '允许 Mod 材质', saveConfig: '保存配置', saving: '保存中…',
    savePrompts: '保存提示词', configSaved: '配置已保存', promptsSaved: '提示词已保存', saveFailed: '保存失败', loadFailed: '加载配置失败',
    addMod: '添加 Mod 方块', addModDesc: '高级模式：允许动态扩展材料数据库',
    modId: 'ID（命名空间:名称）', modName: '显示名称', modCategory: '类别', modAvailability: '可获取性（-1~5）',
    modTextureUrl: '贴图 URL', modStyle: '视觉风格（逗号分隔）', modDescription: '描述', add: '添加',
    importedMods: '已导入 Mod 方块', none: '暂无。', delete: '删除', removed: '已删除',
    saveAs: '另存为', saveAsDesc: '命名保存当前项目的方块快照', saveAsName: '名称', save: '保存',
    savedBlocks: '已保存 {n} 个方块', savedProjects: '已保存的项目', open: '打开',
    reloaded: '已载入保存的项目', loadProjectFailed: '载入保存项目失败', deleted: '已删除',
    promptGeneral: '通用', promptGlobalPlanner: '全局规划器', promptMaterialPlanner: '材料规划器',
    promptRegionGenerator: '区域生成器', promptRepairAgent: '修复代理', promptVisual: '视觉校准',
    pdGlobal: '负责全局布局、区域拆分、接口约束', pdMaterial: '根据目标与主题选择 active palette',
    pdRegion: '生成单个区域的局部蓝图（fill + blocks）', pdRepair: '根据校验报告修复局部', pdVisual: '多视图批判，输出结构化建议',
    noUndo: '没有可撤销的操作', nameRequired: '名称必填',
  },
};

const en: Dict = {
  app: { name: 'mcAgentBuilder', subtitle: 'Constraint-first Minecraft blueprint workbench', loading: 'Loading project state…', loadFailed: 'Failed to load: ' },
  topbar: { mode: 'Mode', view: 'View', edit: 'Edit', camera: 'Camera', reset: '⟳ Reset', bounds: 'Bounds', xray: 'X-ray', blocks: 'blocks' },
  viewModes: { full: 'Full', region: 'Region', layer: 'Layer', material: 'Material', interface: 'Interface', error: 'Error' },
  paletteSlots: { wall: 'Wall', roof: 'Roof', floor: 'Floor', glass: 'Glass', light: 'Light', air: 'Air', soil: 'Soil', metal: 'Metal', plant: 'Plant', liquid: 'Liquid', special: 'Special' },
  tools: {
    title: 'Edit', select: 'Select', paint: 'Paint', erase: 'Erase', build: 'Build', box: 'Box',
    viewHint: 'View mode — left-drag rotates, right-drag pans, wheel zooms. Tab to edit.',
    paintHint: 'Brush: ', pickHint: '(pick from palette)', eraseHint: 'Click a block to remove it.',
    buildHint: 'Click an empty cell to place the selected material.', boxHint: 'Drag to define a temporary region.',
  },
  panels: {
    regions: 'Regions', palette: 'Palette', validation: 'Validation', inspector: 'Inspector', block: 'Block', region: 'Region',
    box: 'Box', interfaces: 'Interfaces', none: 'none', noInterfaces: 'No interfaces.', retry: 'Retry Region', export: 'Export',
    history: 'History', target: 'Target: ', submitRetry: 'Submit Retry', submitting: 'Submitting…',
    preserveInterfaces: 'preserve interfaces', preserveEdits: 'preserve manual edits', exporting: 'Exporting…',
    copy: 'Copy', download: 'Download', retryCount: 'retry: ', patchCount: 'patch: ', selectHint: 'Select a region or block.',
    coord: 'coord', blockField: 'block', regionField: 'region', texture: 'texture', id: 'ID', role: 'role',
  },
  validation: { allClear: 'all clear', issue: 'issue', issues: 'issues', noErrors: 'No validation errors.' },
  toasts: {
    pickMaterialFirst: 'Pick a material first.', retryRecorded: 'Retry recorded.', exported: 'Exported ',
    undone: 'Undone', nothingToUndo: 'Nothing to undo', saved: 'Project saved', saveFailed: 'Save failed',
    loaded: 'Project loaded', loadFailed: 'Load failed', projectCreated: 'Project created',
  },
  bottombar: { void: 'Void', superflat: 'Superflat', background: 'Background', sky: 'Sky', day: 'Day', night: 'Night' },
  newProject: {
    title: 'New Project', name: 'Project name', size: 'Size (X·Y·Z)', theme: 'Theme',
    buildMode: 'Build mode', version: 'Minecraft version', baseFill: 'Base fill (optional)', baseFillBlock: 'Floor block',
    create: 'Create', creating: 'Creating…', loadSample: 'Load sample project',
    defaultName: 'My Castle',
  },
  settings: {
    close: 'Close ✕', general: 'General', prompts: 'Agent Prompts', mods: 'Mod Assets', saves: 'Save As',
    language: 'Language', defaultVersion: 'Default version', defaultBuildMode: 'Default build mode',
    defaultExportFormat: 'Default export format', maxRenderBlocks: 'Max render blocks',
    showBounds: 'Show region bounds', allowModTexture: 'Allow mod textures', saveConfig: 'Save config', saving: 'Saving…',
    savePrompts: 'Save prompts', configSaved: 'Config saved', promptsSaved: 'Prompts saved', saveFailed: 'Save failed', loadFailed: 'Failed to load config',
    addMod: 'Add mod block', addModDesc: 'Advanced: dynamically extend the material database',
    modId: 'ID (namespace:name)', modName: 'Display name', modCategory: 'Category', modAvailability: 'Availability (-1~5)',
    modTextureUrl: 'Texture URL', modStyle: 'Visual style (comma-separated)', modDescription: 'Description', add: 'Add',
    importedMods: 'Imported mod blocks', none: 'None.', delete: 'Delete', removed: 'Removed',
    saveAs: 'Save As', saveAsDesc: 'Save a named snapshot of the current project', saveAsName: 'Name', save: 'Save',
    savedBlocks: 'Saved {n} blocks', savedProjects: 'Saved projects', open: 'Open',
    reloaded: 'Reloaded saved project', loadProjectFailed: 'Failed to load saved project', deleted: 'Deleted',
    promptGeneral: 'General', promptGlobalPlanner: 'Global Planner', promptMaterialPlanner: 'Material Planner',
    promptRegionGenerator: 'Region Generator', promptRepairAgent: 'Repair Agent', promptVisual: 'Visual Calibration',
    pdGlobal: 'Global layout, region split, interface constraints', pdMaterial: 'Choose active palette for goal+theme',
    pdRegion: 'Generate one region blueprint (fill + blocks)', pdRepair: 'Fix issues from validation report', pdVisual: 'Multi-view critique, structured suggestions',
    noUndo: 'Nothing to undo', nameRequired: 'Name required',
  },
};

const dicts: Record<'zh' | 'en', Dict> = { zh, en };
let currentLang: 'zh' | 'en' = 'zh';
const subscribers = new Set<() => void>();

export function setLanguage(lang: 'zh' | 'en') {
  if (lang === currentLang) return;
  currentLang = lang;
  subscribers.forEach((fn) => fn());
}
export function getLanguage() {
  return currentLang;
}

// Recursive proxy so nested access (t.app.name) always resolves through the
// active language dict, and switches the moment setLanguage is called.
function makeProxy(path: string[]): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      let node: Record<string, unknown> = dicts[currentLang] as unknown as Record<string, unknown>;
      for (const key of path) {
        node = node[key] as Record<string, unknown>;
      }
      const value = node[prop];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return makeProxy([...path, prop]);
      }
      return value;
    },
  };
  return new Proxy({}, handler);
}

export const t = makeProxy([]) as Dict;

// Components that want to re-render on language change call useLang().
import { useSyncExternalStore } from 'react';
export function useLang(): 'zh' | 'en' {
  return useSyncExternalStore(
    (cb) => { subscribers.add(cb); return () => subscribers.delete(cb); },
    () => currentLang,
    () => currentLang,
  );
}
