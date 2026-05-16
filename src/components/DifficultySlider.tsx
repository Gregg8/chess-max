interface Props {
  value: number;
  onChange: (v: number) => void;
  id?: string;
}

function label(v: number): string {
  if (v <= 3) return 'Beginner';
  if (v <= 7) return 'Casual';
  if (v <= 12) return 'Club';
  if (v <= 17) return 'Strong';
  return 'Master';
}

export function DifficultySlider({ value, onChange, id }: Props) {
  return (
    <div className="difficulty-slider">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="value">Level {value}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label(value)}</span>
      </div>
      <input
        type="range"
        min={1}
        max={20}
        step={1}
        value={value}
        id={id}
        aria-valuetext={`${label(value)} (level ${value})`}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
      <div className="labels">
        <span>Beginner</span>
        <span>Casual</span>
        <span>Club</span>
        <span>Strong</span>
        <span>Master</span>
      </div>
    </div>
  );
}
