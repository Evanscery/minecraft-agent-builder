import { useState } from 'react';
import type { ExportFormat, ExportResult } from '../types/project';
import { t } from '../utils/i18n';

interface ExportPanelProps {
  onExport: (format: ExportFormat) => Promise<ExportResult>;
  busy: boolean;
}

export function ExportPanel({ onExport, busy }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('litematica');
  const [result, setResult] = useState<ExportResult | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      setResult(await onExport(format));
    } finally {
      setRunning(false);
    }
  }

  function copy() {
    if (result) navigator.clipboard?.writeText(result.content);
  }

  function download() {
    if (!result) return;
    let blob: Blob;
    if (result.format === 'litematica') {
      const binary = Uint8Array.from(atob(result.content), (c) => c.charCodeAt(0));
      blob = new Blob([binary], { type: 'application/octet-stream' });
    } else {
      blob = new Blob([result.content], { type: 'text/plain' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file_name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const preview = result
    ? result.format === 'litematica'
      ? `<base64 litematic · ${Math.round(result.content.length * 0.75 / 1024)} KB>`
      : result.content.slice(0, 4000)
    : '';

  return (
    <section className="panel">
      <h2 className="panel-title">{t.panels.export}</h2>
      <div className="export-row">
        <select className="select" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} disabled={busy}>
          <option value="litematica">litematica（默认）</option>
          <option value="json">json</option>
          <option value="mcfunction">mcfunction</option>
        </select>
        <button className="btn primary" type="button" onClick={run} disabled={running || busy}>
          {running ? t.panels.exporting : t.panels.export}
        </button>
      </div>
      {result && (
        <div className="export-result">
          <div className="export-head">
            <span className="mono small">{result.file_name}</span>
            <span className="export-actions">
              <button type="button" className="btn ghost small" onClick={copy}>{t.panels.copy}</button>
              <button type="button" className="btn ghost small" onClick={download}>{t.panels.download}</button>
            </span>
          </div>
          <pre className="export-pre">{preview}</pre>
        </div>
      )}
    </section>
  );
}
