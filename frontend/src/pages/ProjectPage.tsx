import { useCallback, useEffect, useMemo, useState } from 'react';

import { BottomBar } from '../components/BottomBar';
import { EditPanel } from '../components/EditPanel';
import { ExportPanel } from '../components/ExportPanel';
import { Inspector } from '../components/Inspector';
import { MaterialPanel } from '../components/MaterialPanel';
import { NewProjectDialog } from '../components/NewProjectDialog';
import { RegionTree } from '../components/RegionTree';
import { RetryPanel } from '../components/RetryPanel';
import { SettingsPage } from '../components/SettingsPage';
import { TopBar } from '../components/TopBar';
import { ValidationPanel } from '../components/ValidationPanel';
import { VoxelCanvas, type CameraPreset, type FaceDir } from '../components/VoxelCanvas';
import {
  loadProjectRuntime,
  loadProjectState,
  refreshState,
  runExport,
  runLoad,
  runSave,
  runUndo,
  sendManualPatch,
  sendRetryRequest,
  type ProjectViewState,
  type Tool,
  type ViewMode,
} from '../store/projectStore';
import { getConfig } from '../api/client';
import type { PreviewBlock } from '../types/project';
import { setLanguage, t, useLang } from '../utils/i18n';
import { loadUiState, saveUiState } from '../utils/storage';

const loadingView = <div className="loading">{t.app.loading}</div>;

export function ProjectPage() {
  const [state, setState] = useState<ProjectViewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [cameraSignal, setCameraSignal] = useState<{ preset: CameraPreset; nonce: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [defaultVersion, setDefaultVersion] = useState('1.20.1');
  const [defaultBuildMode, setDefaultBuildMode] = useState('survival_friendly');
  useLang(); // re-render on language switch

  const update = useCallback((fn: (s: ProjectViewState) => ProjectViewState) => {
    setState((cur) => (cur ? fn(cur) : cur));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Load persisted config first (applies language + defaults), then the sample project.
    getConfig()
      .then((cfg) => {
        if (cancelled) return;
        setLanguage(cfg.language);
        setDefaultVersion(cfg.default_version || '1.20.1');
        setDefaultBuildMode(cfg.default_build_mode || 'survival_friendly');
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        loadProjectState()
          .then((s) => {
            if (cancelled) return;
            // Restore persisted UI preferences from localStorage.
            const saved = loadUiState('ui', null) as Partial<ProjectViewState> | null;
            if (saved) {
              Object.assign(s, {
                viewMode: saved.viewMode ?? s.viewMode,
                tool: saved.tool ?? s.tool,
                interactionMode: saved.interactionMode ?? s.interactionMode,
                layerY: saved.layerY ?? s.layerY,
                showRegionBoundary: saved.showRegionBoundary ?? s.showRegionBoundary,
                showInterfaces: saved.showInterfaces ?? s.showInterfaces,
                showErrors: saved.showErrors ?? s.showErrors,
                xray: saved.xray ?? s.xray,
                groundMode: saved.groundMode ?? s.groundMode,
                skyMode: saved.skyMode ?? s.skyMode,
                selectedMaterialId: saved.selectedMaterialId ?? s.selectedMaterialId,
              });
            }
            setState(s);
          })
          .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
          .finally(() => { if (!cancelled) setLoading(false); });
      });
    return () => { cancelled = true; };
  }, []);

  // Persist a slice of UI state so it survives reloads.
  useEffect(() => {
    if (!state) return;
    saveUiState('ui', {
      viewMode: state.viewMode, tool: state.tool, interactionMode: state.interactionMode,
      layerY: state.layerY, showRegionBoundary: state.showRegionBoundary,
      showInterfaces: state.showInterfaces, showErrors: state.showErrors, xray: state.xray,
      groundMode: state.groundMode, skyMode: state.skyMode, selectedMaterialId: state.selectedMaterialId,
    });
  }, [state?.viewMode, state?.tool, state?.interactionMode, state?.layerY, state?.showRegionBoundary, state?.showInterfaces, state?.showErrors, state?.xray, state?.groundMode, state?.skyMode, state?.selectedMaterialId]);

  const doRefresh = useCallback(async (s: ProjectViewState, toast?: ProjectViewState['toast']) => {
    update((cur) => ({ ...(cur ?? s), busy: true, toast: toast ?? cur.toast }));
    try {
      const next = await refreshState(s);
      setState((cur) => (cur ? { ...cur, ...next, busy: false } : cur));
    } catch {
      setState((cur) => (cur ? { ...cur, busy: false } : cur));
    }
  }, [update]);

  const setToast = useCallback((toast: ProjectViewState['toast']) => {
    update((cur) => ({ ...cur, toast }));
    if (toast) setTimeout(() => update((cur) => (cur.toast === toast ? { ...cur, toast: null } : cur)), 2600);
  }, [update]);

  const sendPatch = useCallback(async (
    coord: { x: number; y: number; z: number },
    op: 'set_block' | 'remove_block',
    onFace?: FaceDir,
  ) => {
    if (!state) return;
    if (op === 'set_block' && !state.selectedMaterialId) {
      setToast({ kind: 'error', message: t.toasts.pickMaterialFirst });
      return;
    }
    update((cur) => ({ ...cur, busy: true }));
    try {
      const region = findRegionForBlock(state, coord) ?? state.selectedRegionId ?? 'R1';
      const ops = op === 'set_block'
        ? [{ type: 'set_block' as const, x: coord.x, y: coord.y, z: coord.z, block: state.selectedMaterialId, on_face: onFace ?? null }]
        : [{ type: 'remove_block' as const, x: coord.x, y: coord.y, z: coord.z, block: null }];
      const { detail, applied } = await sendManualPatch(state.projectId, region, ops);
      setToast({ kind: applied > 0 ? 'success' : 'error', message: detail });
      if (applied > 0) setDirty(true);
      await doRefresh(state);
    } finally {
      setState((cur) => (cur ? { ...cur, busy: false } : cur));
    }
  }, [state, update, setToast, doRefresh]);

  const paintBlock = useCallback((coord: { x: number; y: number; z: number }) => sendPatch(coord, 'set_block'), [sendPatch]);
  const eraseBlock = useCallback((coord: { x: number; y: number; z: number }) => sendPatch(coord, 'remove_block'), [sendPatch]);
  const buildBlock = useCallback((coord: { x: number; y: number; z: number }, face: FaceDir) => {
    // After building on a face, select the freshly placed neighbor so the highlight follows it.
    const next = neighborOnFace(coord, face);
    sendPatch(coord, 'set_block', face).then(() => {
      update((s) => ({ ...s, selectedBlock: next }));
    });
  }, [sendPatch, update]);

  const handleOpenCreated = useCallback(async (projectId: string) => {
    setLoading(true);
    setDirty(false);
    try {
      const s = await loadProjectRuntime(projectId);
      setState(s);
      setToast({ kind: 'success', message: t.toasts.projectCreated });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  const handleUndo = useCallback(async () => {
    if (!state) return;
    try {
      const undone = await runUndo(state.projectId);
      setToast(undone ? { kind: 'success', message: t.toasts.undone } : { kind: 'info', message: t.toasts.nothingToUndo });
      if (undone) { if (state.project.manual_patch_history.length <= 1) setDirty(false); await doRefresh(state); }
    } catch {
      setToast({ kind: 'error', message: t.toasts.loadFailed });
    }
  }, [state, setToast, doRefresh]);

  const handleSave = useCallback(async () => {
    if (!state) return;
    try {
      const ok = await runSave(state.projectId);
      setToast(ok ? { kind: 'success', message: t.toasts.saved } : { kind: 'error', message: t.toasts.saveFailed });
      if (ok) setDirty(false);
    } catch {
      setToast({ kind: 'error', message: t.toasts.saveFailed });
    }
  }, [state, setToast]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!state) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl+S applies even from fields; Ctrl+Z does NOT (let text fields keep native undo).
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        if (inField) return;
        e.preventDefault(); handleUndo(); return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave(); return; }
      if (inField) return;

      const map: Record<string, () => void> = {
        '1': () => update((s) => ({ ...s, viewMode: 'full' })),
        '2': () => update((s) => ({ ...s, viewMode: 'region' })),
        '3': () => update((s) => ({ ...s, viewMode: 'layer' })),
        '4': () => update((s) => ({ ...s, viewMode: 'material' })),
        '5': () => update((s) => ({ ...s, viewMode: 'interface' })),
        '6': () => update((s) => ({ ...s, viewMode: 'error' })),
        v: () => update((s) => ({ ...s, tool: 'select', interactionMode: 'edit' })),
        b: () => update((s) => ({ ...s, tool: 'paint', interactionMode: 'edit' })),
        n: () => update((s) => ({ ...s, tool: 'build', interactionMode: 'edit' })),
        e: () => update((s) => ({ ...s, tool: 'erase', interactionMode: 'edit' })),
        x: () => update((s) => ({ ...s, xray: !s.xray })),
        Escape: () => update((s) => ({ ...s, selectedBlock: null })),
        home: () => update((s) => ({ ...s, resetSignal: s.resetSignal + 1 })),
      };
      if (e.key === 'Tab') {
        e.preventDefault();
        update((s) => ({ ...s, interactionMode: s.interactionMode === 'view' ? 'edit' : 'view' }));
        return;
      }
      const fn = map[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(); }
      if (e.key === 'ArrowUp' && e.shiftKey) { e.preventDefault(); update((s) => ({ ...s, layerY: s.layerY + 1 })); }
      if (e.key === 'ArrowDown' && e.shiftKey) { e.preventDefault(); update((s) => ({ ...s, layerY: Math.max(0, s.layerY - 1) })); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, update, handleUndo, handleSave]);

  const blockAt = useCallback((coord: { x: number; y: number; z: number }): PreviewBlock | null => {
    if (!state) return null;
    return state.preview.blocks.find((b) => b.x === coord.x && b.y === coord.y && b.z === coord.z) ?? null;
  }, [state]);

  const selectedRegion = useMemo(() => {
    if (!state) return null;
    return state.project.spec.regions.find((r) => r.id === state.selectedRegionId) ?? null;
  }, [state]);

  const selectedMaterialName = useMemo(() => {
    if (!state || !state.selectedMaterialId) return null;
    return state.project.materials.find((m) => m.id === state.selectedMaterialId)?.name ?? state.selectedMaterialId;
  }, [state]);

  // Cells that sit on an interface (for the "interface" view mode), and regions that have errors.
  const interfaceCells = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    const [ox, oy, oz] = state.project.spec.project.origin;
    for (const iface of state.project.spec.interfaces) {
      for (const x of expandAxis(iface.position.x)) {
        for (const y of expandAxis(iface.position.y)) {
          for (const z of expandAxis(iface.position.z)) {
            set.add(`${ox + x},${oy + y},${oz + z}`);
          }
        }
      }
    }
    return set;
  }, [state]);

  const errorRegions = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    for (const issue of state.validation.errors) {
      if (issue.region) set.add(issue.region);
      issue.regions.forEach((r) => set.add(r));
    }
    return set;
  }, [state]);

  const canUndo = state ? state.project.manual_patch_history.length > 0 : false;

  if (loading) return <div className="app-shell">{loadingView}</div>;
  if (error || !state) return <div className="app-shell"><div className="loading">{t.app.loadFailed}{error ?? ''}</div></div>;

  const blockCount = state.preview.blocks.filter((b) => b.block !== 'minecraft:air').length;

  return (
    <div className="app-shell">
      <TopBar
        projectName={state.project.spec.project.name}
        theme={state.project.spec.project.theme}
        mode={state.project.spec.project.build_mode}
        viewMode={state.viewMode}
        onViewMode={(m) => update((s) => ({ ...s, viewMode: m }))}
        interactionMode={state.interactionMode}
        onInteractionMode={(m) => update((s) => ({ ...s, interactionMode: m }))}
        onCamera={(preset) => setCameraSignal({ preset, nonce: Date.now() })}
        onReset={() => update((s) => ({ ...s, resetSignal: s.resetSignal + 1 }))}
        onUndo={handleUndo}
        onSave={handleSave}
        dirty={dirty}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNewProject={() => setNewProjectOpen(true)}
        canUndo={canUndo}
        xray={state.xray}
        onXray={(v) => update((s) => ({ ...s, xray: v }))}
        showRegionBoundary={state.showRegionBoundary}
        onToggleBoundary={(v) => update((s) => ({ ...s, showRegionBoundary: v }))}
        blockCount={blockCount}
      />
      {state.toast && <div className={`toast ${state.toast.kind}`}>{state.toast.message}</div>}

      <div className="workspace">
        <aside className="col col-left">
          <RegionTree
            regions={state.project.spec.regions}
            preview={state.preview}
            selectedRegionId={state.selectedRegionId}
            onSelect={(id) => update((s) => ({ ...s, selectedRegionId: id, selectedBlock: null }))}
          />
          <MaterialPanel
            materials={state.project.materials}
            palette={state.project.spec.active_palette}
            selectedMaterialId={state.selectedMaterialId}
            onSelect={(id) => update((s) => ({ ...s, selectedMaterialId: id, tool: s.tool === 'select' ? 'paint' : s.tool }))}
            paintActive={state.tool === 'paint'}
          />
          <ValidationPanel
            issues={state.validation.errors}
            onSelectRegion={(id) => update((s) => ({ ...s, selectedRegionId: id, viewMode: 'region' }))}
          />
        </aside>

        <section className="col col-center">
          <div className="canvas-wrap">
            <VoxelCanvas
              preview={state.preview}
              spec={state.project.spec}
              materials={state.project.materials}
              selectedRegionId={state.selectedRegionId}
              selectedBlock={state.selectedBlock}
              viewMode={state.viewMode}
              layerY={state.layerY}
              selectedMaterialId={state.selectedMaterialId}
              interactionMode={state.interactionMode}
              tool={state.tool}
              showRegionBoundary={state.showRegionBoundary}
              showInterfaces={state.showInterfaces}
              showErrors={state.showErrors}
              xray={state.xray}
              groundMode={state.groundMode}
              skyMode={state.skyMode}
              interfaceCells={interfaceCells}
              errorRegions={errorRegions}
              cameraSignal={cameraSignal}
              resetSignal={state.resetSignal}
              onSelectBlock={(c) => update((s) => ({ ...s, selectedBlock: c }))}
              onPaintBlock={paintBlock}
              onEraseBlock={eraseBlock}
              onBuildBlock={buildBlock}
            />
            <div className="canvas-overlay">
              {state.viewMode === 'layer' && (
                <div className="layer-control">
                  <button type="button" onClick={() => update((s) => ({ ...s, layerY: Math.max(0, s.layerY - 1) }))}>−</button>
                  <span>层 y={state.layerY}</span>
                  <button type="button" onClick={() => update((s) => ({ ...s, layerY: s.layerY + 1 }))}>+</button>
                </div>
              )}
              <div className="tool-hint mono small">{t.topbar.mode}：{state.interactionMode === 'view' ? t.topbar.view : t.topbar.edit} · 工具：{state.tool}</div>
            </div>
          </div>
        </section>

        <aside className="col col-right">
          <Inspector
            region={selectedRegion}
            selectedBlock={state.selectedBlock}
            preview={state.preview}
            blockAt={blockAt}
          />
          <EditPanel
            tool={state.tool}
            interactionMode={state.interactionMode}
            onToolChange={(tl: Tool) => update((s) => ({ ...s, tool: tl }))}
            onInteractionMode={(m) => update((s) => ({ ...s, interactionMode: m }))}
            selectedMaterialName={selectedMaterialName}
            busy={state.busy}
          />
          <RetryPanel
            targetRegion={state.selectedRegionId}
            onSubmit={async (payload) => {
              update((s) => ({ ...s, busy: true }));
              try {
                const detail = await sendRetryRequest(state.projectId, payload);
                setToast({ kind: 'success', message: t.toasts.retryRecorded });
                await doRefresh(state);
                return detail;
              } catch (e) {
                setToast({ kind: 'error', message: String(e) });
                throw e;
              } finally {
                setState((cur) => (cur ? { ...cur, busy: false } : cur));
              }
            }}
            disabled={state.busy}
          />
          <ExportPanel
            onExport={async (format) => {
              const res = await runExport(state.projectId, format);
              setToast({ kind: 'success', message: t.toasts.exported + res.file_name });
              update((s) => ({ ...s, lastExport: res }));
              return res;
            }}
            busy={state.busy}
          />
          <section className="panel history-panel">
            <h2 className="panel-title">{t.panels.history}</h2>
            <p className="muted small">{t.panels.retryCount}{state.project.retry_history.length} · {t.panels.patchCount}{state.project.manual_patch_history.length}</p>
          </section>
        </aside>
      </div>

      <BottomBar
        groundMode={state.groundMode}
        onGroundMode={(m) => update((s) => ({ ...s, groundMode: m }))}
        skyMode={state.skyMode}
        onSkyMode={(m) => update((s) => ({ ...s, skyMode: m }))}
      />
      {settingsOpen && (
        <SettingsPage
          projectId={state.projectId}
          onClose={() => setSettingsOpen(false)}
          onConfigSaved={(cfg) => {
            setLanguage(cfg.language);
            setDefaultVersion(cfg.default_version || '1.20.1');
            setDefaultBuildMode(cfg.default_build_mode || 'survival_friendly');
          }}
          onProjectLoaded={handleOpenCreated}
        />
      )}
      {newProjectOpen && (
        <NewProjectDialog
          defaultVersion={defaultVersion}
          defaultBuildMode={defaultBuildMode}
          onClose={() => setNewProjectOpen(false)}
          onCreated={handleOpenCreated}
        />
      )}
    </div>
  );
}

function findRegionForBlock(state: ProjectViewState, coord: { x: number; y: number; z: number }): string | null {
  const block = state.preview.blocks.find((b) => b.x === coord.x && b.y === coord.y && b.z === coord.z);
  return block?.region ?? null;
}

function neighborOnFace(coord: { x: number; y: number; z: number }, face: FaceDir) {
  if (face === 'top') return { x: coord.x, y: coord.y + 1, z: coord.z };
  if (face === 'bottom') return { x: coord.x, y: coord.y - 1, z: coord.z };
  if (face === 'north') return { x: coord.x, y: coord.y, z: coord.z - 1 };
  if (face === 'south') return { x: coord.x, y: coord.y, z: coord.z + 1 };
  if (face === 'east') return { x: coord.x + 1, y: coord.y, z: coord.z };
  return { x: coord.x - 1, y: coord.y, z: coord.z };
}

function expandAxis(value: number | [number, number]): number[] {
  if (typeof value === 'number') return [value];
  const [a, b] = value;
  const out: number[] = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}
