import { useState } from 'react';
import { createProject, type CreateProjectPayload } from '../api/client';
import { t } from '../utils/i18n';

interface NewProjectDialogProps {
  onClose: () => void;
  onCreated: (projectId: string) => void;
  defaultVersion: string;
  defaultBuildMode: string;
}

const VERSIONS = ['1.20', '1.20.1', '1.20.2', '1.20.3', '1.20.4', '1.21', '1.21.1'];
const BUILD_MODES = ['survival_friendly', 'low_cost_survival', 'creative_showcase', 'rare_luxury_survival'];
const FLOOR_BLOCKS = [
  'minecraft:stone_bricks', 'minecraft:cobblestone', 'minecraft:oak_planks',
  'minecraft:spruce_planks', 'minecraft:grass_block', 'minecraft:sand',
];

export function NewProjectDialog({ onClose, onCreated, defaultVersion, defaultBuildMode }: NewProjectDialogProps) {
  const [name, setName] = useState(t.newProject.defaultName);
  const [sx, setSx] = useState(16);
  const [sy, setSy] = useState(16);
  const [sz, setSz] = useState(16);
  const [theme, setTheme] = useState('custom');
  const [version, setVersion] = useState(defaultVersion);
  const [buildMode, setBuildMode] = useState(defaultBuildMode);
  const [useFloor, setUseFloor] = useState(true);
  const [floorBlock, setFloorBlock] = useState('minecraft:stone_bricks');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!name.trim()) { setErr('名称必填'); return; }
    setBusy(true);
    try {
      const payload: CreateProjectPayload = {
        name: name.trim(),
        size: [sx, sy, sz],
        origin: [0, 64, 0],
        theme: theme.trim() || 'custom',
        build_mode: buildMode as CreateProjectPayload['build_mode'],
        version,
        regions: [],
        base_fills: useFloor
          ? [{ region_id: 'R1', from: [0, 0, 0], to: [sx - 1, 0, sz - 1], block: floorBlock }]
          : [],
      };
      const res = await createProject(payload);
      onCreated(res.project_id);
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="settings-head">
          <strong>{t.newProject.title}</strong>
          <button className="btn ghost small" onClick={onClose}>✕</button>
        </header>
        <div className="settings-body">
          <div className="settings-tab">
            <label className="field"><span>{t.newProject.name}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field"><span>{t.newProject.size}</span>
              <div className="size-row">
                <input type="number" min={1} value={sx} onChange={(e) => setSx(Math.max(1, Number(e.target.value)))} />
                <input type="number" min={1} value={sy} onChange={(e) => setSy(Math.max(1, Number(e.target.value)))} />
                <input type="number" min={1} value={sz} onChange={(e) => setSz(Math.max(1, Number(e.target.value)))} />
              </div>
            </label>
            <label className="field"><span>{t.newProject.theme}</span>
              <input value={theme} onChange={(e) => setTheme(e.target.value)} />
            </label>
            <div className="form-grid">
              <label className="field"><span>{t.newProject.buildMode}</span>
                <select value={buildMode} onChange={(e) => setBuildMode(e.target.value)}>
                  {BUILD_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label className="field"><span>{t.newProject.version}</span>
                <select value={version} onChange={(e) => setVersion(e.target.value)}>
                  {VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            </div>
            <label className="check"><input type="checkbox" checked={useFloor} onChange={(e) => setUseFloor(e.target.checked)} /> {t.newProject.baseFill}</label>
            {useFloor && (
              <label className="field"><span>{t.newProject.baseFillBlock}</span>
                <select value={floorBlock} onChange={(e) => setFloorBlock(e.target.value)}>
                  {FLOOR_BLOCKS.map((b) => <option key={b} value={b}>{b.replace('minecraft:', '')}</option>)}
                </select>
              </label>
            )}
            {err && <p className="muted small" style={{ color: 'var(--red)' }}>{err}</p>}
            <button className="btn primary" disabled={busy} onClick={submit}>{busy ? t.newProject.creating : t.newProject.create}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
