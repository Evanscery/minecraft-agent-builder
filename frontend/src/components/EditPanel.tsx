import type { Tool, InteractionMode } from '../store/projectStore';
import { t } from '../utils/i18n';

interface EditPanelProps {
  tool: Tool;
  interactionMode: InteractionMode;
  onToolChange: (tool: Tool) => void;
  onInteractionMode: (m: InteractionMode) => void;
  selectedMaterialName: string | null;
  busy: boolean;
}

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'select', label: t.tools.select, key: 'V' },
  { id: 'paint', label: t.tools.paint, key: 'B' },
  { id: 'build', label: t.tools.build, key: 'N' },
  { id: 'erase', label: t.tools.erase, key: 'E' },
];

export function EditPanel({ tool, interactionMode, onToolChange, onInteractionMode, selectedMaterialName, busy }: EditPanelProps) {
  const editing = interactionMode === 'edit';
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.tools.title}</h2>
        <div className="mode-toggle">
          <button
            className={`mini-seg ${!editing ? 'active' : ''}`}
            type="button"
            onClick={() => onInteractionMode('view')}
            title={`${t.topbar.view} (Tab)`}
          >{t.topbar.view}</button>
          <button
            className={`mini-seg ${editing ? 'active' : ''}`}
            type="button"
            onClick={() => onInteractionMode('edit')}
            title={`${t.topbar.edit} (Tab)`}
          >{t.topbar.edit}</button>
        </div>
      </div>
      <div className="tool-row">
        {TOOLS.map((tl) => (
          <button
            key={tl.id}
            className={`tool-btn ${tool === tl.id && editing ? 'active' : ''}`}
            type="button"
            onClick={() => { onToolChange(tl.id); onInteractionMode('edit'); }}
            title={`${tl.label} (${tl.key})`}
          >
            <span className="tool-key">{tl.key}</span>
            {tl.label}
          </button>
        ))}
      </div>
      {tool === 'paint' && editing && (
        <p className="muted small">{t.tools.paintHint}<strong>{selectedMaterialName ?? t.panels.none}</strong>{t.tools.pickHint}</p>
      )}
      {tool === 'build' && editing && (
        <p className="muted small">{t.tools.buildHint}</p>
      )}
      {tool === 'erase' && editing && <p className="muted small">{t.tools.eraseHint}</p>}
      {!editing && <p className="muted small">{t.tools.viewHint}</p>}
    </section>
  );
}
