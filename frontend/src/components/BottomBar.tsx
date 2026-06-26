import type { GroundMode, SkyMode } from '../store/projectStore';
import { t } from '../utils/i18n';

interface BottomBarProps {
  groundMode: GroundMode;
  onGroundMode: (m: GroundMode) => void;
  skyMode: SkyMode;
  onSkyMode: (m: SkyMode) => void;
}

export function BottomBar({ groundMode, onGroundMode, skyMode, onSkyMode }: BottomBarProps) {
  return (
    <footer className="bottombar">
      <div className="bottombar-group">
        <span className="group-label">地面</span>
        <button className={`seg ${groundMode === 'void' ? 'active' : ''}`} type="button" onClick={() => onGroundMode('void')}>{t.bottombar.void}</button>
        <button className={`seg ${groundMode === 'superflat' ? 'active' : ''}`} type="button" onClick={() => onGroundMode('superflat')}>{t.bottombar.superflat}</button>
      </div>
      <div className="bottombar-group">
        <span className="group-label">{t.bottombar.background}</span>
        <button className={`seg ${skyMode === 'sky' ? 'active' : ''}`} type="button" onClick={() => onSkyMode('sky')}>{t.bottombar.sky}</button>
        <button className={`seg ${skyMode === 'day' ? 'active' : ''}`} type="button" onClick={() => onSkyMode('day')}>{t.bottombar.day}</button>
        <button className={`seg ${skyMode === 'night' ? 'active' : ''}`} type="button" onClick={() => onSkyMode('night')}>{t.bottombar.night}</button>
      </div>
    </footer>
  );
}
