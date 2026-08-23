import type { Target } from "../astronomy/targets";
import type { ObservationPoint } from "../types";


function formatNumber(value: number) {
    const [whole, decimal] = value.toFixed(3).split(".");
    return `${whole.padStart(3, " ")}.${decimal}`;
}

export function BodyInfo({ target, selectedPoint }: { target: Target, selectedPoint: ObservationPoint }) {
    const isMoon = target.name === "Moon";

    return (
        <div className="object-details">
            <div className="flex-item">
                <span className="object-text">Visibility score:</span>
                <span className="mono object-info">{formatNumber(selectedPoint.score)}</span>
            </div>
            <div className="flex-item">
                <span className="object-text">Apparent magnitude:</span>
                <span className="mono object-info">{formatNumber(selectedPoint.magnitude)}</span>
            </div>
            <div className="flex-item">
                <span className="object-text">Altitude:</span>
                <span className="mono object-info">{formatNumber(selectedPoint.altitude)}°</span>
            </div>
            <div className="flex-item">
                <span className="object-text">Azimuth:</span>
                <span className="mono object-info">{formatNumber(selectedPoint.azimuth)}°</span>
            </div>
            <div className="flex-item">
                <span className="object-text">Constellation:</span>
                <span className="mono object-info">{selectedPoint.constellation}</span>
            </div>
            <div className="flex-item">
                <span className="object-text">Distance:</span>
                <span className="mono object-info">{isMoon ? selectedPoint.distanceKm.toFixed(3) + " km" : selectedPoint.distanceAU.toFixed(3) + " AU"}</span>
            </div>
        </div>
    );
}