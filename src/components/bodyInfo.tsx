import { MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import type { Target } from "../astronomy/targets";
import type { ObservationPoint } from "../types";
import * as Astronomy from "astronomy-engine";


const BODIES: string[] = ["Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function formatNumber(value: number, decimals = 1) {
    return value.toFixed(decimals);
}

function scoreLabel(score: number): string {
    if (score >= 0.8) return "Excellent";
    if (score >= 0.5) return "Good";
    if (score >= 0.2) return "Marginal";
    return "Poor";
}

export function BodyInfo({ target, selectedPoint, onSelectBody }: { target: Target, selectedPoint: ObservationPoint, onSelectBody: (event: SelectChangeEvent) => void }) {
    const isMoon = target.name === "Moon";
    const scorePercent = Math.round(selectedPoint.score * 100);

    return (
        <div className="object-details">
            <div className="object-text">
                <Select
                    value={target.name}
                    onChange={onSelectBody}
                >
                    {Object.values(Astronomy.Body).filter(v => BODIES.includes(v)).map((item, i) => {
                        return (
                            <MenuItem value={item} key={i}>{item}</MenuItem>
                        );
                    })}
                </Select>
                at <span className="mono object-info">{selectedPoint.localTime ? selectedPoint.localTime.toFormat("HH:mm") : "--:--"}</span>:
            </div>
            <div className="score-block">
                <div className="score-header">
                    <span className="score-label">{scoreLabel(selectedPoint.score)}{selectedPoint.altitude < 0 ? " (below horizon)" : ""}</span>
                    <span className="score-value">{scorePercent}%</span>
                </div>
                <div className="score-bar">
                    <div className="score-bar-fill" style={{ width: `${scorePercent}%` }} />
                </div>
            </div>

            <div className="detail-section">
                <div className="detail-row">
                    <span className="detail-label">Altitude</span>
                    <span className="detail-value mono">{formatNumber(selectedPoint.altitude)}°</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Azimuth</span>
                    <span className="detail-value mono">{formatNumber(selectedPoint.azimuth)}°</span>
                </div>
            </div>

            <div className="detail-section">
                <div className="detail-row">
                    <span className="detail-label">Magnitude</span>
                    <span className="detail-value mono">{formatNumber(selectedPoint.magnitude, 2)}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Distance</span>
                    <span className="detail-value mono">
                        {isMoon
                            ? `${formatNumber(selectedPoint.distanceKm, 0)} km`
                            : `${formatNumber(selectedPoint.distanceAU, 3)} AU`}
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Constellation</span>
                    <span className="detail-value">{selectedPoint.constellation}</span>
                </div>
            </div>
        </div>
    );
}