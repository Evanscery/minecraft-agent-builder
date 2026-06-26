import type {
  ExportRequest,
  ExportResponse,
  ManualPatchRequest,
  ManualPatchResponse,
  PreviewResponse,
  ProjectStateResponse,
  ProjectSummaryResponse,
  RetryRequest,
  RetryResponse,
  ValidationResponse,
} from '../types/project';
import type {
  AgentPromptStore,
  ModMaterialRecord,
  SavedProject,
  UserConfig,
} from '../types/config';

const API_BASE_URL = 'http://127.0.0.1:9393';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function createSampleProject(): Promise<ProjectSummaryResponse> {
  return request<ProjectSummaryResponse>('/projects/sample', { method: 'POST' });
}

export interface CreateProjectPayload {
  name: string;
  size: [number, number, number];
  origin?: [number, number, number];
  theme?: string;
  build_mode?: string;
  version?: string;
  regions?: Array<{ id: string; box: [number, number, number, number, number, number]; role?: string }>;
  base_fills?: Array<{ region_id?: string; from: [number, number, number]; to: [number, number, number]; block: string }>;
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectSummaryResponse> {
  return request<ProjectSummaryResponse>('/projects/create', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchProject(projectId: string): Promise<ProjectStateResponse> {
  return request<ProjectStateResponse>(`/projects/${projectId}`);
}

export async function fetchProjectPreview(projectId: string): Promise<PreviewResponse> {
  return request<PreviewResponse>(`/projects/${projectId}/preview`);
}

export async function fetchProjectValidation(projectId: string): Promise<ValidationResponse> {
  return request<ValidationResponse>(`/projects/${projectId}/validation`);
}

export async function submitRetryRequest(projectId: string, payload: RetryRequest): Promise<RetryResponse> {
  return request<RetryResponse>(`/projects/${projectId}/retry-region`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitManualPatch(projectId: string, payload: ManualPatchRequest): Promise<ManualPatchResponse> {
  return request<ManualPatchResponse>(`/projects/${projectId}/manual-patch`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function exportProject(projectId: string, payload: ExportRequest): Promise<ExportResponse> {
  return request<ExportResponse>(`/projects/${projectId}/export`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function undoProject(projectId: string): Promise<{ undone: boolean }> {
  return request<{ undone: boolean }>(`/projects/${projectId}/undo`, { method: 'POST' });
}

export async function saveProject(projectId: string): Promise<{ saved: boolean }> {
  return request<{ saved: boolean }>(`/projects/${projectId}/save`, { method: 'POST' });
}

export async function loadProject(projectId: string): Promise<{ loaded: boolean }> {
  return request<{ loaded: boolean }>(`/projects/${projectId}/load`, { method: 'POST' });
}

// --- config / prompts / mods / save-as ---
export async function getConfig(): Promise<UserConfig> {
  return request<UserConfig>('/config');
}

export async function saveConfig(config: UserConfig): Promise<UserConfig> {
  return request<UserConfig>('/config', { method: 'PUT', body: JSON.stringify(config) });
}

export async function getPrompts(): Promise<AgentPromptStore> {
  return request<AgentPromptStore>('/config/prompts');
}

export async function savePrompts(prompts: AgentPromptStore): Promise<AgentPromptStore> {
  return request<AgentPromptStore>('/config/prompts', { method: 'PUT', body: JSON.stringify(prompts) });
}

export async function listMods(): Promise<ModMaterialRecord[]> {
  return request<ModMaterialRecord[]>('/mods');
}

export async function addMod(mod: ModMaterialRecord): Promise<ModMaterialRecord> {
  return request<ModMaterialRecord>('/mods', { method: 'POST', body: JSON.stringify(mod) });
}

export async function removeMod(modId: string): Promise<{ removed: boolean }> {
  return request<{ removed: boolean }>(`/mods/${encodeURIComponent(modId)}`, { method: 'DELETE' });
}

export async function listSavedProjects(): Promise<SavedProject[]> {
  return request<SavedProject[]>('/saved-projects');
}

export async function saveProjectAs(projectId: string, name: string): Promise<{ saved: boolean; name: string; block_count: number }> {
  return request(`/projects/${projectId}/save-as`, { method: 'POST', body: JSON.stringify({ name }) });
}

export async function deleteSavedProject(name: string): Promise<{ removed: boolean }> {
  return request(`/saved-projects/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export async function loadSavedProject(name: string): Promise<{ project_id: string; loaded: boolean }> {
  return request(`/saved-projects/${encodeURIComponent(name)}/load`, { method: 'POST' });
}
