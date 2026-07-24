import type { CSSProperties } from "react";

const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;

export function RadiusSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const boundedValue = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, value));
  const progress = ((boundedValue - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 100;
  const style = { "--radius-progress": `${progress}%` } as CSSProperties;

  return (
    <div className="radius-picker" style={style}>
      <div className="radius-picker__control">
        <div className="radius-picker__rail">
          <span className="radius-picker__track" aria-hidden="true"><span className="radius-picker__fill" /></span>
          <input
            id="search-radius"
            className="radius-picker__input"
            type="range"
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            step="1"
            value={boundedValue}
            aria-label="Радиус поиска"
            aria-valuetext={`${boundedValue} км`}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <output className="radius-picker__value" htmlFor="search-radius">
            <strong>{boundedValue}</strong>{" "}<span>км</span>
          </output>
        </div>
      </div>
    </div>
  );
}
