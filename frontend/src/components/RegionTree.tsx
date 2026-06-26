import type { Region, PreviewData } from '../types/project';
import { t } from '../utils/i18n';

interface RegionTreeProps {
  regions: Region[];
  preview: PreviewData;
  selectedRegionId: string | null;
  onSelect: (regionId: string) => void;
}

export function RegionTree({ regions, preview, selectedRegionId, onSelect }: RegionTreeProps) {
  const countByRegion = new Map<string, number>();
  for (const block of preview.blocks) {
    if (block.block === 'minecraft:air') continue;
    countByRegion.set(block.region, (countByRegion.get(block.region) ?? 0) + 1);
  }

  return (
    <section className="panel">
      <h2 className="panel-title">{t.panels.regions}</h2>
      <ul className="tree-list">
        {regions.map((region) => {
          const selected = region.id === selectedRegionId;
          const interfaces = preview.interfaces.filter((i) => i.between.includes(region.id)).length;
          return (
            <li key={region.id}>
              <button
                className={`tree-row ${selected ? 'selected' : ''}`}
                type="button"
                onClick={() => onSelect(region.id)}
              >
                <span className="tree-dot" style={{ background: dotColor(region.id) }} />
                <span className="tree-id">{region.id}</span>
                <span className="tree-role">{region.role}</span>
                <span className="tree-meta" title="方块 · 接口">{countByRegion.get(region.id) ?? 0} · {interfaces}i</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function dotColor(regionId: string): string {
  let hash = 0;
  for (let i = 0; i < regionId.length; i += 1) hash = (hash * 31 + regionId.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 65% 60%)`;
}
