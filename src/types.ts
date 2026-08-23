import type { DateTime } from "luxon";
import type { Target } from "./astronomy/targets";

export interface MoonInfo {
    altitude: number;
    phaseAngle: number;
    separation: number;
}
export interface Location {
    lat: number;
    lng: number;
    zoom: number;
}

export interface ObservationPoint {
    minute: number;
    localTime: DateTime;
    score: number;
    margin: number | null;
    altitude: number;
    azimuth: number;
    sunAltitude: number;
    sunAzimuth: number;
    sunDistanceAU: number;
    poleAltAz: {
        altitude: number;
        azimuth: number;
    };
    siriusAltAz: {
        altitude: number;
        azimuth: number;
    };
    magnitude: number;
    distanceAU: number;
    distanceKm: number;
    constellation: string;
}

export interface ObservationDay {
    target: Target;
    date: DateTime;
    timezone: string;
    points: ObservationPoint[];
}