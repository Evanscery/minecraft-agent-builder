import type { PreviewData, Region, PreviewBlock } from '../types/project';
import { t } from '../utils/i18n';

interface InspectorProps {
  region: Region | null;
  selectedBlock: { x: number; y: number; z: number } | null;
  preview: PreviewData;
  blockAt: (coord: { x: number; y: number; z: number }) => PreviewBlock | null;
}

export function Inspector({ region, selectedBlock, preview, blockAt }: InspectorProps) {
  if (selectedBlock) {
    const block = blockAt(selectedBlock);
    return (
      <section className="panel">
        <h2 className="panel-title">{t.panels.block}</h2>
        <dl className="kv">
          <dt>{t.panels.coord}</dt>
          <dd className="mono">{selectedBlock.x}, {selectedBlock.y}, {selectedBlock.z}</dd>
          <dt>{t.panels.blockField}</dt>
          <dd className="mono">{block?.block ?? 'minecraft:air'}</dd>
          <dt>{t.panels.regionField}</dt>
          <dd>{block?.region ?? region?.id ?? '—'}</dd>
          <dt>{t.panels.texture}</dt>
          <dd className="muted mono small">{block?.texture ?? '—'}</dd>
        </dl>
      </section>
    );
  }

  if (!region) {
    return (
      <section className="panel">
        <h2 className="panel-title">{t.panels.inspector}</h2>
        <p className="muted">{t.panels.selectHint}</p>
      </section>
    );
  }

  const related = preview.interfaces.filter((i) => i.between.includes(region.id));
  return (
    <section className="panel">
      <h2 className="panel-title">{t.panels.region}</h2>
      <dl className="kv">
        <dt>{t.panels.id}</dt>
        <dd>{region.id}</dd>
        <dt>{t.panels.role}</dt>
        <dd>{region.role}</dd>
        <dt>{t.panels.box}</dt>
        <dd className="mono small">{region.box.join(', ')}</dd>
      </dl>
      <h3 className="sub-title">{t.panels.interfaces}</h3>
      {related.length === 0 ? (
        <p className="muted small">{t.panels.noInterfaces}</p>
      ) : (
        <ul className="iface-list">
          {related.map((i) => (
            <li key={i.id}>
              <span className={`iface-tag ${i.type}`}>{i.type}</span>
              <span className="muted small">{i.id}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
