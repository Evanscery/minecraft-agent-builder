import {
  createSampleProject,
  exportProject,
  fetchProject,
  fetchProjectPreview,
  fetchProjectValidation,
  loadProject,
  saveProject,
  submitManualPatch,
  submitRetryRequest,
  undoProject,
} from '../api/client';
import type {
  ExportFormat,
  ExportResult,
  ManualPatchOperation,
  PreviewData,
  ProjectStateResponse,
  RetryRequest,
  ValidationReport,
} from '../types/project';

export type ViewMode = 'full' | 'region' | 'layer' | 'material' | 'interface' | 'error';
export type Tool = 'select' | 'inspect' | 'paint' | 'erase' | 'build' | 'box';
export type InteractionMode = 'view' | 'edit';
export type GroundMode = 'void' | 'superflat';
export type SkyMode = 'sky' | 'day' | 'night';

export type Coord = { x: number; y: number; z: number };

export type Toast = { kind: 'info' | 'success' | 'error'; message: string } | null;

export interface ProjectViewState {
  projectId: string;
  project: ProjectStateResponse;
  preview: PreviewData;
  validation: ValidationReport;
  // UI
  selectedRegionId: string | null;
  selectedBlock: Coord | null;
  selectedMaterialId: string | null;
  boxSelection: [number, number, number, number, number, number] | null;
  viewMode: ViewMode;
  tool: Tool;
  interactionMode: InteractionMode;
  layerY: number;
  showRegionBoundary: boolean;
  showInterfaces: boolean;
  showErrors: boolean;
  xray: boolean;
  groundMode: GroundMode;
  skyMode: SkyMode;
  busy: boolean;
  toast: Toast;
  lastExport: ExportResult | null;
  resetSignal: number;
}

export async function loadProjectState(projectId?: string, useSample = true): Promise<ProjectViewState> {
  const summary = projectId
    ? null
    : useSample
      ? await createSampleProject()
      : null;
  const id = projectId ?? summary!.project_id;
  return buildState(id);
}

export async function loadProjectRuntime(projectId: string): Promise<ProjectViewState> {
  return buildState(projectId);
}

async function buildState(projectId: string): Promise<ProjectViewState> {
  const [project, preview, validation] = await Promise.all([
    fetchProject(projectId),
    fetchProjectPreview(projectId),
    fetchProjectValidation(projectId),
  ]);

  const paletteBlocks = Object.values(project.spec.active_palette.slots).flat();
  return {
    projectId,
    project,
    preview: preview.preview,
    validation: validation.validation_report,
    selectedRegionId: project.spec.regions[0]?.id ?? null,
    selectedBlock: null,
    selectedMaterialId: paletteBlocks[0] ?? null,
    boxSelection: null,
    viewMode: 'full',
    tool: 'select',
    interactionMode: 'view',
    layerY: 0,
    showRegionBoundary: true,
    showInterfaces: true,
    showErrors: true,
    xray: false,
    groundMode: 'void',
    skyMode: 'sky',
    busy: false,
    toast: null,
    lastExport: null,
    resetSignal: 1,
  };
}

async function refresh(projectId: string): Promise<Pick<ProjectViewState, 'project' | 'preview' | 'validation'>> {
  const [project, preview, validation] = await Promise.all([
    fetchProject(projectId),
    fetchProjectPreview(projectId),
    fetchProjectValidation(projectId),
  ]);
  return {
    project,
    preview: preview.preview,
    validation: validation.validation_report,
  };
}

export async function refreshState(state: ProjectViewState): Promise<Partial<ProjectViewState>> {
  const next = await refresh(state.projectId);
  return { ...next, busy: false };
}

export async function sendRetryRequest(projectId: string, payload: RetryRequest): Promise<string> {
  const response = await submitRetryRequest(projectId, payload);
  return response.result.detail;
}

export async function sendManualPatch(
  projectId: string,
  targetRegion: string,
  ops: ManualPatchOperation[],
): Promise<{ detail: string; applied: number }> {
  const response = await submitManualPatch(projectId, {
    target_region: targetRegion,
    source: 'frontend_edit',
    ops,
  });
  return { detail: response.result.detail, applied: response.result.applied_ops };
}

export async function runExport(projectId: string, format: ExportFormat): Promise<ExportResult> {
  const response = await exportProject(projectId, { format });
  return response.result;
}

export async function runUndo(projectId: string): Promise<boolean> {
  const response = await undoProject(projectId);
  return response.undone;
}

export async function runSave(projectId: string): Promise<boolean> {
  const response = await saveProject(projectId);
  return response.saved;
}

export async function runLoad(projectId: string): Promise<boolean> {
  const response = await loadProject(projectId);
  return response.loaded;
}
