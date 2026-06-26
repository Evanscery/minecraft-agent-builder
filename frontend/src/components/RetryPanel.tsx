import { useState } from 'react';
import type { RetryRequest } from '../types/project';
import { t } from '../utils/i18n';

interface RetryPanelProps {
  targetRegion: string | null;
  onSubmit: (payload: RetryRequest) => Promise<string>;
  disabled?: boolean;
}

export function RetryPanel({ targetRegion, onSubmit, disabled }: RetryPanelProps) {
  const [instruction, setInstruction] = useState('加高塔顶并使用更陡的屋脊，保持门洞对齐。');
  const [preserve, setPreserve] = useState({ interfaces: true, edits: true });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!targetRegion) {
      setMsg('请先选择区域。');
      return;
    }
    setBusy(true);
    try {
      const detail = await onSubmit({
        target_region: targetRegion,
        user_instruction: instruction,
        preserve_interfaces: preserve.interfaces,
        preserve_manual_edits: preserve.edits,
      });
      setMsg(detail);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2 className="panel-title">{t.panels.retry}</h2>
      <p className="muted small">{t.panels.target}<strong>{targetRegion ?? '—'}</strong></p>
      <textarea
        className="text-area"
        rows={3}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <label className="check">
        <input type="checkbox" checked={preserve.interfaces} onChange={(e) => setPreserve({ ...preserve, interfaces: e.target.checked })} />
        {t.panels.preserveInterfaces}
      </label>
      <label className="check">
        <input type="checkbox" checked={preserve.edits} onChange={(e) => setPreserve({ ...preserve, edits: e.target.checked })} />
        {t.panels.preserveEdits}
      </label>
      <button className="btn primary" type="button" onClick={submit} disabled={busy || disabled}>
        {busy ? t.panels.submitting : t.panels.submitRetry}
      </button>
      {msg && <p className="muted small">{msg}</p>}
    </section>
  );
}
