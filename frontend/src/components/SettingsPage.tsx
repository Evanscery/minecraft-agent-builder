import { useEffect, useState } from 'react';
import {
  addMod,
  deleteSavedProject,
  getConfig,
  getPrompts,
  listMods,
  listSavedProjects,
  loadSavedProject,
  removeMod,
  saveConfig,
  savePrompts,
  saveProjectAs,
} from '../api/client';
import type { AgentPromptStore, ModMaterialRecord, SavedProject, UserConfig } from '../types/config';
import { t } from '../utils/i18n';

type Tab = 'general' | 'prompts' | 'mods' | 'saves';

interface SettingsPageProps {
  projectId: string | null;
  onClose: () => void;
  onConfigSaved: (cfg: UserConfig) => void;
  onProjectLoaded: (projectId: string) => void;
}

const PROMPT_META: { id: keyof AgentPromptStore; label: string; desc: string }[] = [
  { id: 'global_planner', label: 'settings.promptGlobalPlanner', desc: 'settings.pdGlobal' },
  { id: 'material_planner', label: 'settings.promptMaterialPlanner', desc: 'settings.pdMaterial' },
  { id: 'region_generator', label: 'settings.promptRegionGenerator', desc: 'settings.pdRegion' },
  { id: 'repair_agent', label: 'settings.promptRepairAgent', desc: 'settings.pdRepair' },
  { id: 'visual_calibration', label: 'settings.promptVisual', desc: 'settings.pdVisual' },
];

const CATEGORIES = ['stone', 'wood', 'glass', 'light', 'plant', 'metal', 'soil', 'liquid', 'special'];
const VERSIONS = ['1.20', '1.20.1', '1.20.2', '1.20.3', '1.20.4', '1.21', '1.21.1'];
const BUILD_MODES = ['survival_friendly', 'low_cost_survival', 'creative_showcase', 'rare_luxury_survival'];

export function SettingsPage({ projectId, onClose, onConfigSaved, onProjectLoaded }: SettingsPageProps) {
  const [tab, setTab] = useState<Tab>('general');
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [prompts, setPrompts] = useState<AgentPromptStore | null>(null);
  const [mods, setMods] = useState<ModMaterialRecord[]>([]);
  const [saves, setSaves] = useState<SavedProject[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getConfig().then(setConfig).catch(() => setMsg(t.settings.loadFailed));
    getPrompts().then(setPrompts).catch(() => {});
    listMods().then(setMods).catch(() => {});
    listSavedProjects().then(setSaves).catch(() => {});
  }, []);

  function notify(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2400);
  }

  async function persistConfig(next: UserConfig) {
    setSaving(true);
    try {
      const saved = await saveConfig(next);
      setConfig(saved);
      onConfigSaved(saved);
      notify(t.settings.configSaved);
    } catch { notify(t.settings.saveFailed); }
    finally { setSaving(false); }
  }

  async function persistPrompts(next: AgentPromptStore) {
    setSaving(true);
    try {
      await savePrompts(next);
      setPrompts(next);
      notify(t.settings.promptsSaved);
    } catch { notify(t.settings.saveFailed); }
    finally { setSaving(false); }
  }

  async function reloadSaves() { setSaves(await listSavedProjects()); }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="settings-head">
          <div className="settings-tabs">
            <button className={`seg ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>{t.settings.general}</button>
            <button className={`seg ${tab === 'prompts' ? 'active' : ''}`} onClick={() => setTab('prompts')}>{t.settings.prompts}</button>
            <button className={`seg ${tab === 'mods' ? 'active' : ''}`} onClick={() => setTab('mods')}>{t.settings.mods}</button>
            <button className={`seg ${tab === 'saves' ? 'active' : ''}`} onClick={() => setTab('saves')}>{t.settings.saves}</button>
          </div>
          <button className="btn ghost small" onClick={onClose}>{t.settings.close}</button>
        </header>

        {msg && <div className="toast info inline">{msg}</div>}

        <div className="settings-body">
          {tab === 'general' && config && (
            <GeneralTab config={config} onChange={persistConfig} saving={saving} />
          )}
          {tab === 'prompts' && prompts && (
            <PromptsTab prompts={prompts} onChange={persistPrompts} saving={saving} />
          )}
          {tab === 'mods' && (
            <ModsTab mods={mods} onReload={() => listMods().then(setMods)} onNotify={notify} />
          )}
          {tab === 'saves' && (
            <SavesTab saves={saves} projectId={projectId} onReload={reloadSaves} onNotify={notify} onOpen={onProjectLoaded} />
          )}
        </div>
      </div>
    </div>
  );
}

function GeneralTab({ config, onChange, saving }: { config: UserConfig; onChange: (c: UserConfig) => void; saving: boolean }) {
  const [local, setLocal] = useState<UserConfig>(config);
  return (
    <div className="settings-tab">
      <label className="field"><span>{t.settings.language}</span>
        <select value={local.language} onChange={(e) => setLocal({ ...local, language: e.target.value as 'zh' | 'en' })}>
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </label>
      <div className="form-grid">
        <label className="field"><span>{t.settings.defaultVersion}</span>
          <select value={local.default_version} onChange={(e) => setLocal({ ...local, default_version: e.target.value })}>
            {VERSIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="field"><span>{t.settings.defaultBuildMode}</span>
          <select value={local.default_build_mode} onChange={(e) => setLocal({ ...local, default_build_mode: e.target.value })}>
            {BUILD_MODES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      </div>
      <label className="field"><span>{t.settings.defaultExportFormat}</span>
        <select value={local.export.default_format ?? 'litematica'} onChange={(e) => setLocal({ ...local, export: { ...local.export, default_format: e.target.value } })}>
          {['litematica', 'json', 'mcfunction'].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label className="field"><span>{t.settings.maxRenderBlocks}</span>
        <input type="number" value={local.preview.max_render_blocks ?? 5000} onChange={(e) => setLocal({ ...local, preview: { ...local.preview, max_render_blocks: Number(e.target.value) } })} />
      </label>
      <label className="check"><input type="checkbox" checked={local.renderer.show_region_boundary ?? true} onChange={(e) => setLocal({ ...local, renderer: { ...local.renderer, show_region_boundary: e.target.checked } })} /> {t.settings.showBounds}</label>
      <label className="check"><input type="checkbox" checked={local.materials.allow_mod_texture ?? false} onChange={(e) => setLocal({ ...local, materials: { ...local.materials, allow_mod_texture: e.target.checked } })} /> {t.settings.allowModTexture}</label>
      <button className="btn primary" disabled={saving} onClick={() => onChange(local)}>{saving ? t.settings.saving : t.settings.saveConfig}</button>
    </div>
  );
}

function PromptsTab({ prompts, onChange, saving }: { prompts: AgentPromptStore; onChange: (p: AgentPromptStore) => void; saving: boolean }) {
  const [local, setLocal] = useState<AgentPromptStore>(prompts);
  return (
    <div className="settings-tab">
      {PROMPT_META.map((m) => {
        const label = (t.settings as unknown as Record<string, string>)[m.label.replace('settings.', '')];
        const desc = (t.settings as unknown as Record<string, string>)[m.desc.replace('settings.', '')];
        return (
          <div key={m.id} className="prompt-block">
            <div className="prompt-head"><strong>{label}</strong><span className="muted small">{desc}</span></div>
            <textarea className="text-area" rows={4} value={local[m.id]} onChange={(e) => setLocal({ ...local, [m.id]: e.target.value })} />
          </div>
        );
      })}
      <button className="btn primary" disabled={saving} onClick={() => onChange(local)}>{saving ? t.settings.saving : t.settings.savePrompts}</button>
    </div>
  );
}

function ModsTab({ mods, onReload, onNotify }: { mods: ModMaterialRecord[]; onReload: () => void; onNotify: (m: string) => void }) {
  const [draft, setDraft] = useState<ModMaterialRecord>({
    id: '', name: '', description: '', category: 'wood', availability: 3, visual_style: [],
    texture_path: '', source: 'mod_import', version: '', texture_url: '',
  });
  const [styleInput, setStyleInput] = useState('');

  async function submit() {
    if (!draft.id || !draft.name) { onNotify(t.settings.nameRequired); return; }
    try {
      await addMod({ ...draft, visual_style: styleInput.split(',').map((s) => s.trim()).filter(Boolean) });
      onNotify(t.settings.add);
      onReload();
      setDraft({ ...draft, id: '', name: '', description: '', texture_url: '' });
    } catch { onNotify(t.settings.saveFailed); }
  }

  return (
    <div className="settings-tab">
      <div className="prompt-block">
        <div className="prompt-head"><strong>{t.settings.addMod}</strong><span className="muted small">{t.settings.addModDesc}</span></div>
        <div className="form-grid">
          <label className="field"><span>{t.settings.modId}</span><input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder="biomesoplenty:willow_planks" /></label>
          <label className="field"><span>{t.settings.modName}</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="field"><span>{t.settings.modCategory}</span>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{(t.paletteSlots as Record<string, string>)[c] ?? c}</option>)}
            </select>
          </label>
          <label className="field"><span>{t.settings.modAvailability}</span><input type="number" min={-1} max={5} value={draft.availability} onChange={(e) => setDraft({ ...draft, availability: Number(e.target.value) })} /></label>
          <label className="field"><span>{t.settings.modTextureUrl}</span><input value={draft.texture_url ?? ''} onChange={(e) => setDraft({ ...draft, texture_url: e.target.value })} placeholder="https://.../willow_planks.png" /></label>
          <label className="field"><span>{t.settings.modStyle}</span><input value={styleInput} onChange={(e) => setStyleInput(e.target.value)} placeholder="natural,fantasy" /></label>
        </div>
        <label className="field"><span>{t.settings.modDescription}</span><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
        <button className="btn primary" onClick={submit}>{t.settings.add}</button>
      </div>
      <div className="prompt-block">
        <div className="prompt-head"><strong>{t.settings.importedMods}</strong></div>
        {mods.length === 0 ? <p className="muted small">{t.settings.none}</p> : (
          <ul className="tree-list">
            {mods.map((m) => (
              <li key={m.id} className="mod-row">
                <span className="mono small">{m.id}</span>
                <span>{m.name}</span>
                <button className="btn ghost small" onClick={async () => { await removeMod(m.id); onReload(); onNotify(t.settings.deleted); }}>{t.settings.delete}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SavesTab({ saves, projectId, onReload, onNotify, onOpen }: { saves: SavedProject[]; projectId: string | null; onReload: () => void; onNotify: (m: string) => void; onOpen: (id: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="settings-tab">
      <div className="prompt-block">
        <div className="prompt-head"><strong>{t.settings.saveAs}</strong><span className="muted small">{t.settings.saveAsDesc}</span></div>
        <div className="form-grid">
          <label className="field"><span>{t.settings.saveAsName}</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-castle" /></label>
        </div>
        <button className="btn primary" disabled={!projectId || !name} onClick={async () => {
          if (!projectId || !name) return;
          try { const r = await saveProjectAs(projectId, name); onNotify(t.settings.savedBlocks.replace('{n}', String(r.block_count))); onReload(); }
          catch { onNotify(t.settings.saveFailed); }
        }}>{t.settings.save}</button>
      </div>
      <div className="prompt-block">
        <div className="prompt-head"><strong>{t.settings.savedProjects}</strong></div>
        {saves.length === 0 ? <p className="muted small">{t.settings.none}</p> : (
          <ul className="tree-list">
            {saves.map((s) => (
              <li key={s.name} className="mod-row">
                <span className="mono small">{s.name}</span>
                <span className="muted small">{s.blocks.length} · {new Date(s.created_at).toLocaleString()}</span>
                <span className="export-actions">
                  <button className="btn ghost small" onClick={async () => {
                    try { const r = await loadSavedProject(s.name); onOpen(r.project_id); onNotify(t.settings.reloaded); }
                    catch { onNotify(t.settings.loadProjectFailed); }
                  }}>{t.settings.open}</button>
                  <button className="btn ghost small" onClick={async () => { await deleteSavedProject(s.name); onReload(); onNotify(t.settings.deleted); }}>{t.settings.delete}</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
