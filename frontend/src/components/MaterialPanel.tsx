import type { MaterialRecord, ActivePalette } from '../types/project';
import { blockColor } from '../utils/colors';
import { t } from '../utils/i18n';

interface MaterialPanelProps {
  materials: MaterialRecord[];
  palette: ActivePalette;
  selectedMaterialId: string | null;
  onSelect: (blockId: string) => void;
  paintActive: boolean;
}

export function MaterialPanel({ materials, palette, selectedMaterialId, onSelect, paintActive }: MaterialPanelProps) {
  const matMap = new Map(materials.map((m) => [m.id, m]));
  const slots = Object.entries(palette.slots).filter(([slot]) => slot !== 'air');
  const mods = materials.filter((m) => m.source === 'mod_import');

  return (
    <section className="panel">
      <h2 className="panel-title">{t.panels.palette}{paintActive ? ' · 绘制' : ''}</h2>
      <div className="palette-slots">
        {slots.map(([slot, ids]) => (
          <div className="palette-slot" key={slot}>
            <div className="palette-slot-name">{(t.paletteSlots as Record<string, string>)[slot] ?? slot}</div>
            <div className="palette-chips">
              {ids.map((id) => {
                const mat = matMap.get(id);
                const selected = id === selectedMaterialId;
                return (
                  <button
                    key={id}
                    className={`palette-chip ${selected ? 'selected' : ''}`}
                    type="button"
                    title={`${mat?.name ?? id} · 可获取性 ${mat?.availability ?? ''}`}
                    onClick={() => onSelect(id)}
                  >
                    <span className="chip-swatch" style={{ background: blockColor(id, mat?.category) }} />
                    <span className="chip-name">{mat?.name ?? id.replace('minecraft:', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {mods.length > 0 && (
          <div className="palette-slot" key="mod">
            <div className="palette-slot-name">{(t.paletteSlots as Record<string, string>).special ?? 'Mod'}</div>
            <div className="palette-chips">
              {mods.map((m) => {
                const selected = m.id === selectedMaterialId;
                return (
                  <button
                    key={m.id}
                    className={`palette-chip ${selected ? 'selected' : ''}`}
                    type="button"
                    title={`${m.name} · ${m.texture_url ?? ''}`}
                    onClick={() => onSelect(m.id)}
                  >
                    <span className="chip-swatch" style={{ background: blockColor(m.id, m.category) }} />
                    <span className="chip-name">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

