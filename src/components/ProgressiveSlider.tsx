import React from 'react';

interface ProgressiveSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  precision?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  sublabel?: string;
  accentIndicator?: string;
}

export const ProgressiveSlider: React.FC<ProgressiveSliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  precision = 1,
  onChange,
  disabled = false,
  sublabel,
  accentIndicator,
}) => {
  const clamped = Math.min(max, Math.max(min, value));
  const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="text-[13px] font-bold text-slate-950 leading-snug flex items-center gap-1.5"
        >
          {accentIndicator && (
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 ring-1 ring-slate-900/15"
              style={{ backgroundColor: accentIndicator }}
              aria-hidden="true"
            />
          )}
          <span>{label}</span>
        </label>
        <span className="font-mono-num text-sm font-extrabold text-slate-950 shrink-0">
          {value.toFixed(precision)}
          {unit && <span className="text-xs font-bold text-slate-800 ml-0.5">{unit}</span>}
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="emerald-slider disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, #059669 0%, #059669 ${pct}%, #a7f3d0 ${pct}%, #a7f3d0 100%)`,
        }}
      />

      <div className="flex items-center justify-between text-xs font-mono-num font-semibold text-slate-700">
        <span>
          {min}
          {unit}
        </span>
        {sublabel && (
          <span className="font-sans text-xs font-semibold text-slate-700 truncate max-w-[160px]">
            {sublabel}
          </span>
        )}
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
};
