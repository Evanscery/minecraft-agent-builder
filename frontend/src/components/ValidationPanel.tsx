import type { ValidationIssue } from '../types/project';
import { t } from '../utils/i18n';

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onSelectRegion: (regionId: string) => void;
}

const SEVERITY: Record<string, string> = {
  material_violation: 'warn',
  merge_conflict: 'error',
  out_of_region: 'error',
  missing_gate: 'error',
  wall_gap: 'error',
  invalid_patch: 'warn',
};

const LABEL: Record<string, string> = {
  material_violation: '材料违规',
  merge_conflict: '合并冲突',
  out_of_region: '越界',
  missing_gate: '门洞缺失',
  wall_gap: '墙体缺口',
  invalid_patch: '无效补丁',
};

export function ValidationPanel({ issues, onSelectRegion }: ValidationPanelProps) {
  const count = issues.length;
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.panels.validation}</h2>
        <span className={`badge ${count === 0 ? 'ok' : 'bad'}`}>
          {count === 0 ? t.validation.allClear : `${count} ${count > 1 ? t.validation.issues : t.validation.issue}`}
        </span>
      </div>
      {count === 0 ? (
        <p className="muted">{t.validation.noErrors}</p>
      ) : (
        <ul className="issue-list">
          {issues.map((issue, i) => {
            const sev = SEVERITY[issue.type] ?? 'warn';
            const target = issue.region ?? issue.regions[0];
            return (
              <li key={`${issue.type}-${i}`} className={`issue ${sev}`}>
                <button type="button" className="issue-body" onClick={() => target && onSelectRegion(target)}>
                  <span className="issue-type">{LABEL[issue.type] ?? issue.type}</span>
                  <span className="issue-detail">{issue.detail}</span>
                  {issue.regions.length > 0 && <span className="issue-meta">{issue.regions.join(' · ')}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

