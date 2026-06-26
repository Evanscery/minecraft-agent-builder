export type UserConfig = {
  language: 'zh' | 'en';
  default_version: string;
  default_build_mode: string;
  renderer: {
    texture_pack?: string | null;
    show_region_boundary?: boolean | null;
    show_interfaces?: boolean | null;
    show_errors?: boolean | null;
    enable_layer_view?: boolean | null;
    enable_xray_view?: boolean | null;
  };
  interaction: {
    enable_region_select?: boolean | null;
    enable_block_select?: boolean | null;
    enable_box_select?: boolean | null;
    enable_manual_edit?: boolean | null;
    enable_region_retry?: boolean | null;
  };
  preview: {
    default_camera?: string | null;
    default_visibility_mode?: string | null;
    max_render_blocks?: number | null;
    chunk_render_size?: number | null;
  };
  materials: {
    show_material_panel?: boolean | null;
    allow_material_replace?: boolean | null;
    allow_mod_texture?: boolean | null;
  };
  export: {
    default_format?: string | null;
    allow_mcfunction?: boolean | null;
    allow_schematic?: boolean | null;
    allow_litematic?: boolean | null;
    allow_json?: boolean | null;
  };
};

export type AgentPromptStore = {
  global_planner: string;
  material_planner: string;
  region_generator: string;
  repair_agent: string;
  visual_calibration: string;
};

export type ModMaterialRecord = {
  id: string;
  name: string;
  description?: string;
  category: string;
  availability: number;
  visual_style: string[];
  texture_path: string;
  source: string;
  version: string;
  texture_url?: string | null;
  hardness?: number | null;
  material?: string | null;
  diggable?: boolean | null;
  transparent?: boolean | null;
  emit_light?: number | null;
  bounding_box?: string | null;
};

export type SavedProject = {
  name: string;
  project_id: string;
  spec: Record<string, unknown>;
  blocks: Array<{ x: number; y: number; z: number; block: string; region: string }>;
  created_at: string;
};
