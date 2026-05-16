import type { Settings, ThemeName, EveSpeed, PassPlayOrientation } from '../types';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

const THEME_LABELS: Record<ThemeName, string> = {
  'classic-wood': 'Classic wood',
  'tournament-green': 'Tournament green',
  midnight: 'Midnight',
  'high-contrast': 'High contrast',
};

const SPEED_LABELS: Record<EveSpeed, string> = {
  fast: 'Fast',
  normal: 'Normal',
  slow: 'Slow',
};

const ORIENTATION_LABELS: Record<PassPlayOrientation, string> = {
  'auto-flip': 'Auto-flip',
  'fixed-white': 'White on bottom',
};

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal settings">
        <h2 id="settings-title">Settings</h2>

        <div className="field">
          <label>Theme</label>
          <div className="theme-grid">
            {(Object.keys(THEME_LABELS) as ThemeName[]).map((t) => (
              <button
                key={t}
                aria-pressed={settings.theme === t}
                onClick={() => update('theme', t)}
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Pass &amp; play orientation</label>
          <div className="row">
            {(Object.keys(ORIENTATION_LABELS) as PassPlayOrientation[]).map((o) => (
              <button
                key={o}
                aria-pressed={settings.passPlayOrientation === o}
                className={settings.passPlayOrientation === o ? 'primary' : ''}
                onClick={() => update('passPlayOrientation', o)}
              >
                {ORIENTATION_LABELS[o]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Engine vs engine speed</label>
          <div className="row">
            {(Object.keys(SPEED_LABELS) as EveSpeed[]).map((s) => (
              <button
                key={s}
                aria-pressed={settings.eveSpeed === s}
                className={settings.eveSpeed === s ? 'primary' : ''}
                onClick={() => update('eveSpeed', s)}
              >
                {SPEED_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="toggle-row">
            <label htmlFor="snd">Sound</label>
            <input
              id="snd"
              type="checkbox"
              checked={settings.soundOn}
              onChange={(e) => update('soundOn', e.target.checked)}
            />
          </div>
          <div className="toggle-row">
            <label htmlFor="anm">Animation</label>
            <input
              id="anm"
              type="checkbox"
              checked={settings.animationOn}
              onChange={(e) => update('animationOn', e.target.checked)}
            />
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
