import type { PointerEvent } from "react";
import type { ObservationDay } from "../observation/observation";


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

export function VisibilityChart({
    day,
    selectedMinute,
    onMinuteChange,
}: { 
    day: ObservationDay;
    selectedMinute: number;
    onMinuteChange: (minute: number) => void;
}) {
    const width = 1200;
    const height = 170;
    const plot = { left: 56, right: 6, top: 20, bottom: 10 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const x = (minute: number) => plot.left + (minute / 1439) * plotWidth;
    const y = (score: number) => plot.top + (1 - score) * plotHeight;
    const scoreTicks = [0, 0.25, 0.5, 0.75, 1];
    const timeTicks = Array.from({ length: 13 }, (_, index) => index * 120);
    const selectedPoint = day.points[selectedMinute];

    function updateHover(event: PointerEvent<SVGRectElement>) {
        const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
        if (!bounds) return;
        const chartX = ((event.clientX - bounds.left) / bounds.width) * width;
        const minute = Math.round(((chartX - plot.left) / plotWidth) * 1439);
        onMinuteChange(Math.max(0, Math.min(1439, minute)));
    }

    const tooltipX = Math.max(plot.left + 66, Math.min(width - plot.right - 66, x(selectedPoint.minute)));
    const tooltipY = Math.max(plot.top + 46, y(selectedPoint.score) - 22);

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
                {selectedPoint && (
                    <g className="hover-layer" pointerEvents="none">
                        <line className="hover-guide" x1={x(selectedPoint.minute)} x2={x(selectedPoint.minute)} y1={plot.top} y2={height - plot.bottom} />
                        <circle className="hover-point" cx={x(selectedPoint.minute)} cy={y(selectedPoint.score)} r="6" style={{ fill: scoreColor(selectedPoint.score) }} />
                        <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                            <rect className="tooltip" x="-86" y="-43" width="172" height="38" rx="3" />
                            <text className="tooltip-text" x="0" y="-27" textAnchor="middle">{formatTime(selectedPoint.minute)} · {day.timezone}</text>
                            <text className="tooltip-score" x="0" y="-12" textAnchor="middle">Score {selectedPoint.score.toFixed(3)}</text>
                        </g>
                    </g>
                )}
                <rect className="hover-capture" x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} onPointerMove={updateHover} />
                <text className="axis-title" x={plot.left} y={10}>Visibility score</text>
            </svg>
        </div>
    );
}