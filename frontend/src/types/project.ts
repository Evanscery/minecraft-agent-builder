export type Coordinate = [number, number, number];
export type Box = [number, number, number, number, number, number];
export type ExportFormat = 'litematica' | 'json' | 'mcfunction';

export type MaterialRecord = {
  id: string;
  name: string;
  description: string;
  category: string;
  availability: number;
  visual_style: string[];
  texture_path: string;
  source: string;
  version: string;
  hardness?: number | null;
  material?: string | null;
  diggable?: boolean | null;
  transparent?: boolean | null;
  emit_light?: number | null;
  filter_light?: number | null;
  bounding_box?: string | null;
  texture_url?: string | null;
};

export type ActivePalette = {
  slots: Record<string, string[]>;
};

export type Region = {
  id: string;
  box: Box;
  role: string;
  constraints: string[];
};

export type InterfacePosition = {
  x: number | [number, number];
  y: number | [number, number];
  z: number | [number, number];
};

export type InterfaceConstraint = {
  id: string;
  between: [string, string];
  type: string;
  position: InterfacePosition;
  rule: string;
};

export type ProjectSpec = {
  project: {
    name: string;
    size: Coordinate;
    origin: Coordinate;
    theme: string;
    build_mode: string;
  };
  active_palette: ActivePalette;
  regions: Region[];
  interfaces: InterfaceConstraint[];
};

export type ValidationIssue = {
  type: string;
  region?: string | null;
  regions: string[];
  interface?: string | null;
  detail: string;
};

export type ValidationReport = {
  errors: ValidationIssue[];
};

export type PreviewBlock = {
  x: number;
  y: number;
  z: number;
  block: string;
  region: string;
  texture?: string | null;
};

export type PreviewData = {
  blocks: PreviewBlock[];
  regions: Region[];
  interfaces: InterfaceConstraint[];
  errors: ValidationIssue[];
};

export type RetryRequest = {
  target_region: string;
  user_instruction: string;
  preserve_interfaces: boolean;
  preserve_manual_edits: boolean;
};

export type RetryResult = {
  project_id: string;
  target_region: string;
  status: 'accepted';
  detail: string;
};

export type ManualPatchOperation = {
  type: 'set_block' | 'remove_block';
  x: number;
  y: number;
  z: number;
  block?: string | null;
  on_face?: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west' | null;
};

export type ManualPatchRequest = {
  target_region: string;
  ops: ManualPatchOperation[];
  source: string;
};

export type ManualPatchResult = {
  project_id: string;
  target_region: string;
  applied_ops: number;
  status: 'accepted';
  detail: string;
};

export type ExportRequest = {
  format: ExportFormat;
};

export type ExportResult = {
  project_id: string;
  format: ExportFormat;
  file_name: string;
  content: string;
};

export type CommandState = {
  retry_history: RetryRequest[];
  manual_patch_history: ManualPatchRequest[];
};

export type FrontendConfig = {
  renderer: {
    texture_pack: string;
    show_region_boundary: boolean;
    show_interfaces: boolean;
    show_errors: boolean;
    enable_layer_view: boolean;
    enable_xray_view: boolean;
  };
  interaction: {
    enable_region_select: boolean;
    enable_block_select: boolean;
    enable_box_select: boolean;
    enable_manual_edit: boolean;
    enable_region_retry: boolean;
  };
  preview: {
    default_camera: string;
    default_visibility_mode: string;
    max_render_blocks: number;
    chunk_render_size: number;
  };
  materials: {
    show_material_panel: boolean;
    allow_material_replace: boolean;
    allow_mod_texture: boolean;
  };
  export: {
    default_format: string;
    allow_mcfunction: boolean;
    allow_schematic: boolean;
    allow_litematic: boolean;
    allow_json: boolean;
  };
};

export type ProjectSummaryResponse = {
  project_id: string;
  project: ProjectSpec;
  frontend_config: FrontendConfig;
};

export type ProjectStateResponse = {
  project_id: string;
  spec: ProjectSpec;
  materials: MaterialRecord[];
  validation_report: ValidationReport;
  frontend_config: FrontendConfig;
  retry_history: RetryRequest[];
  manual_patch_history: ManualPatchRequest[];
};

export type PreviewResponse = {
  project_id: string;
  preview: PreviewData;
};

export type ValidationResponse = {
  project_id: string;
  validation_report: ValidationReport;
};

export type RetryResponse = {
  result: RetryResult;
};

export type ManualPatchResponse = {
  result: ManualPatchResult;
};

export type ExportResponse = {
  result: ExportResult;
};
