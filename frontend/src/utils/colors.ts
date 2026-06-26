import type { MaterialRecord } from '../types/project';

// Category -> base color for procedural placeholder textures.
export const CATEGORY_COLORS: Record<string, string> = {
  stone: '#8a8f98',
  wood: '#9c6b3f',
  glass: '#9fd3ff',
  light: '#ffd27a',
  metal: '#c0c6cf',
  plant: '#6fae5a',
  special: '#5a6273',
};

const BLOCK_COLOR_OVERRIDE: Record<string, string> = {
  'minecraft:air': 'transparent',
  'minecraft:stone_bricks': '#7d828c',
  'minecraft:cobblestone': '#6f747d',
  'minecraft:mossy_cobblestone': '#6a7466',
  'minecraft:spruce_planks': '#6e4a2b',
  'minecraft:spruce_stairs': '#744e2e',
  'minecraft:oak_planks': '#b58550',
  'minecraft:glass_pane': '#bfe6ff',
  'minecraft:torch': '#ffb347',
  'minecraft:lantern': '#ffcf6b',
  'minecraft:quartz_block': '#ece9ef',
  'minecraft:command_block': '#b88a3a',
};

export function blockColor(blockId: string, category?: string): string {
  if (BLOCK_COLOR_OVERRIDE[blockId]) return BLOCK_COLOR_OVERRIDE[blockId];
  if (category) return CATEGORY_COLORS[category] ?? '#6b7280';
  return '#6b7280';
}

export function categoryFor(materials: MaterialRecord[], blockId: string): string | undefined {
  return materials.find((m) => m.id === blockId)?.category;
}

export function regionColor(regionId: string): string {
  let hash = 0;
  for (let i = 0; i < regionId.length; i += 1) {
    hash = (hash * 31 + regionId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 65% 60%)`;
}
