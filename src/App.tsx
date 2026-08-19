import { useState, type PointerEvent } from "react";
import * as Astronomy from "astronomy-engine";
import { calculateDay, type ObservationDay } from "./observation/observation";
import { makePlanetTarget } from "./astronomy/targets";
import "./index.css";

const LATITUDE = 0;
const LONGITUDE = 0;
const TARGET = makePlanetTarget(Astronomy.Body.Uranus);

function formatTime(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function scoreColor(score: number) {
  const stops = [
    [0, [68, 1, 84]],
    [0.25, [59, 82, 139]],
    [0.5, [33, 145, 140]],
    [0.75, [94, 201, 98]],
    [1, [253, 231, 37]],
  ] as const;
  const clampedScore = Math.max(0, Math.min(1, score));
  const upperIndex = stops.findIndex(([stop]) => stop >= clampedScore);
  const lowerIndex = upperIndex <= 0 ? 0 : upperIndex - 1;
  const upperStop = stops[upperIndex] ?? stops[stops.length - 1];
  const lowerStop = stops[lowerIndex];
  const amount = upperStop[0] === lowerStop[0]
    ? 0
    : (clampedScore - lowerStop[0]) / (upperStop[0] - lowerStop[0]);
  const channels = lowerStop[1].map((channel, index) => Math.round(channel + (upperStop[1][index] - channel) * amount));
  return `rgb(${channels.join(", ")})`;
}

function VisibilityChart({ day }: { day: ObservationDay }) {
  const width = 1200;
  const height = 560;
  const plot = { left: 76, right: 28, top: 34, bottom: 66 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const x = (minute: number) => plot.left + (minute / 1439) * plotWidth;
  const y = (score: number) => plot.top + (1 - score) * plotHeight;
  const scoreTicks = [0, 0.25, 0.5, 0.75, 1];
  const timeTicks = Array.from({ length: 13 }, (_, index) => index * 120);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const hoveredPoint = hoveredIndex === null ? null : day.points[hoveredIndex];

  function updateHover(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return;
    const chartX = ((event.clientX - bounds.left) / bounds.width) * width;
    const minute = Math.round(((chartX - plot.left) / plotWidth) * 1439);
    setHoveredIndex(Math.max(0, Math.min(1439, minute)));
  }

  const tooltipX = hoveredPoint ? Math.max(plot.left + 66, Math.min(width - plot.right - 66, x(hoveredPoint.minute))) : 0;
  const tooltipY = hoveredPoint ? Math.max(plot.top + 46, y(hoveredPoint.score) - 22) : 0;

  return (
    <div className="chart-shell">
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Visibility of ${day.target.name}`}>
        {scoreTicks.map((score) => (
          <g key={score}>
            <line className="grid-line" x1={plot.left} x2={width - plot.right} y1={y(score)} y2={y(score)} />
            <text className="axis-label" x={plot.left - 14} y={y(score) + 5} textAnchor="end">{score.toFixed(2)}</text>
          </g>
        ))}
        {timeTicks.map((minute) => (
          <g key={minute}>
            <line className="grid-line vertical" x1={x(minute)} x2={x(minute)} y1={plot.top} y2={height - plot.bottom} />
            <text className="axis-label" x={x(minute)} y={height - plot.bottom + 28} textAnchor="middle">{formatTime(minute)}</text>
          </g>
        ))}
        {day.points.slice(0, -1).map((point, index) => {
          const nextPoint = day.points[index + 1];
          if (Math.abs(nextPoint.score - point.score) > 0.1) { return; }
          return <line key={point.minute} className="score-line" x1={x(point.minute)} y1={y(point.score)} x2={x(nextPoint.minute)} y2={y(nextPoint.score)} style={{ stroke: scoreColor((point.score + nextPoint.score) / 2) }} />;
        })}
        {hoveredPoint && (
          <g className="hover-layer" pointerEvents="none">
            <line className="hover-guide" x1={x(hoveredPoint.minute)} x2={x(hoveredPoint.minute)} y1={plot.top} y2={height - plot.bottom} />
            <circle className="hover-point" cx={x(hoveredPoint.minute)} cy={y(hoveredPoint.score)} r="6" style={{ fill: scoreColor(hoveredPoint.score) }} />
            <g transform={`translate(${tooltipX}, ${tooltipY})`}>
              <rect className="tooltip" x="-66" y="-43" width="132" height="38" rx="3" />
              <text className="tooltip-text" x="0" y="-27" textAnchor="middle">{formatTime(hoveredPoint.minute)} · {day.timezone}</text>
              <text className="tooltip-score" x="0" y="-12" textAnchor="middle">Score {hoveredPoint.score.toFixed(3)}</text>
            </g>
          </g>
        )}
        <rect className="hover-capture" x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} onPointerMove={updateHover} onPointerLeave={() => setHoveredIndex(null)} />
        <text className="axis-title" x={plot.left} y={18}>Visibility score</text>
        <text className="axis-title" x={width / 2} y={height - 10} textAnchor="middle">Local time of day</text>
      </svg>
    </div>
  );
}

function App() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [day, setDay] = useState(() => calculateDay(TARGET, LATITUDE, LONGITUDE));

  function updateDate(value: string) {
    const nextDate = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(nextDate.getTime())) {
      setSelectedDate(nextDate);
      setDay(calculateDay(TARGET, LATITUDE, LONGITUDE, nextDate));
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Naked-eye observing planner</p>
          <h1>Easy<span>vis</span></h1>
          <p className="subtitle">Some description at some point perhaps</p>
        </div>
        <label className="date-control">Observation date
          <input type="date" value={selectedDate.toISOString().slice(0, 10)} onChange={(event) => updateDate(event.target.value)} />
        </label>
      </header>
      <section className="summary-grid">
        <div><span className="label">Target</span><strong>{day.target.name}</strong></div>
        <div><span className="label">Location</span><strong>{LATITUDE.toFixed(2)}° N, {LONGITUDE.toFixed(2)}° E</strong></div>
      </section>
      <section className="plot-section">
        <div className="section-heading"><div><p className="eyebrow">24-hour forecast</p><h2>Visibility of {day.target.name}</h2></div></div>
        <VisibilityChart day={day} />
      </section>
    </main>
  );
}

export default App;
