import type { ViewMode, InteractionMode } from '../store/projectStore';
import type { CameraPreset } from './VoxelCanvas';
import { t } from '../utils/i18n';

interface TopBarProps {
  projectName: string;
  theme: string;
  mode: string;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  interactionMode: InteractionMode;
  onInteractionMode: (m: InteractionMode) => void;
  onCamera: (preset: CameraPreset) => void;
  onReset: () => void;
  onUndo: () => void;
  onSave: () => void;
  dirty: boolean;
  onOpenSettings: () => void;
  onOpenNewProject: () => void;
  canUndo: boolean;
  xray: boolean;
  onXray: (v: boolean) => void;
  showRegionBoundary: boolean;
  onToggleBoundary: (v: boolean) => void;
  blockCount: number;
}

const VIEW_MODE_IDS: { id: ViewMode; key: string }[] = [
  { id: 'full', key: '1' },
  { id: 'region', key: '2' },
  { id: 'layer', key: '3' },
  { id: 'material', key: '4' },
  { id: 'interface', key: '5' },
  { id: 'error', key: '6' },
];

export function TopBar({
  projectName, theme, mode, viewMode, onViewMode, interactionMode, onInteractionMode,
  onCamera, onReset, onUndo, onSave, dirty, onOpenSettings, onOpenNewProject, canUndo, xray, onXray, showRegionBoundary, onToggleBoundary, blockCount,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark">◈</span>
        <div className="brand-text">
          <strong>{t.app.name}</strong>
          <span className="muted small">{projectName} · {theme} · {mode}</span>
        </div>
      </div>

      <div className="topbar-group mode-group">
        <span className="group-label">{t.topbar.mode}</span>
        <button
          className={`seg ${interactionMode === 'view' ? 'active' : ''}`}
          type="button"
          onClick={() => onInteractionMode('view')}
          title={`${t.topbar.view} (Tab)`}
        >{t.topbar.view}</button>
        <button
          className={`seg ${interactionMode === 'edit' ? 'active' : ''}`}
          type="button"
          onClick={() => onInteractionMode('edit')}
          title={`${t.topbar.edit} (Tab)`}
        >{t.topbar.edit}</button>
      </div>

      <div className="topbar-group action-group">
        <button className="seg icon-btn" type="button" onClick={onOpenNewProject} title="新建项目">✚ 新建</button>
        <button className="seg icon-btn" type="button" onClick={onUndo} disabled={!canUndo} title={`撤销 (Ctrl+Z)`}>↶ 撤销</button>
        <button className="seg icon-btn" type="button" onClick={onSave} title="保存 (Ctrl+S)">💾 保存{dirty ? <span className="dirty-dot" /> : null}</button>
        <button className="seg icon-btn" type="button" onClick={onOpenSettings} title="设置 / 多级菜单">⚙ 设置</button>
      </div>

      <div className="topbar-group">
        <span className="group-label">{t.topbar.view}</span>
        {VIEW_MODE_IDS.map((v) => (
          <button
            key={v.id}
            className={`seg ${viewMode === v.id ? 'active' : ''}`}
            type="button"
            onClick={() => onViewMode(v.id)}
            title={`${t.viewModes[v.id]} (${v.key})`}
          >{t.viewModes[v.id]}</button>
        ))}
      </div>

      <div className="topbar-group">
        <span className="group-label">{t.topbar.camera}</span>
        {(['iso', 'front', 'side', 'top'] as CameraPreset[]).map((p) => (
          <button key={p} className="seg" type="button" onClick={() => onCamera(p)} title={p}>{p}</button>
        ))}
        <button className="seg reset-btn" type="button" onClick={onReset} title={`${t.topbar.reset} (Home)`}>{t.topbar.reset}</button>
      </div>

      <div className="topbar-group toggles">
        <label className="check">
          <input type="checkbox" checked={showRegionBoundary} onChange={(e) => onToggleBoundary(e.target.checked)} /> {t.topbar.bounds}
        </label>
        <label className="check">
          <input type="checkbox" checked={xray} onChange={(e) => onXray(e.target.checked)} /> {t.topbar.xray}
        </label>
      </div>
      <div className="topbar-meta mono small">{blockCount} {t.topbar.blocks}</div>
    </header>
  );
}
