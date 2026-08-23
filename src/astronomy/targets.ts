import * as Astronomy from "astronomy-engine";


export class Target {
    name: string;
    body: Astronomy.Body;
    fixedMagnitude: number | null;

    constructor(
        name: string,
        body: Astronomy.Body,
        fixedMagnitude: number | null = null
    ) {
        this.name = name;
        this.body = body;
        this.fixedMagnitude = fixedMagnitude;
    }

    equator(
        time: Astronomy.AstroTime,
        observer: Astronomy.Observer
    ) {
        return Astronomy.Equator(this.body, time, observer, true, true);
    }

    magnitude(time: Astronomy.AstroTime) {
        if (this.fixedMagnitude !== null) {
            return this.fixedMagnitude;
        }
        return Astronomy.Illumination(this.body, time).mag;
    }

    geoDistance(time: Astronomy.AstroTime, km: boolean = false) {
        return Astronomy.Illumination(this.body, time).geo_dist * (km ? 149597870.691 : 1);
    }
}

export function makeBodyTarget(body: Astronomy.Body) {
    return new Target(body, body);
}

export function makeStarTarget(
    name: string,
    raHours: number,
    decDeg: number,
    magnitude: number,
    slot: Astronomy.Body = Astronomy.Body.Star1,
    distanceLy: number = 1000.0
) {
    Astronomy.DefineStar(slot, raHours, decDeg, distanceLy);
    return new Target(name, slot, magnitude);
}