import * as Astronomy from "astronomy-engine";
import type { Target } from "./targets";
import { angularSeparation } from "./coordinates";

export function calculatePositions(
    target: Target,
    time: Astronomy.AstroTime,
    observer: Astronomy.Observer
) {
    const bodyEq = target.equator(time, observer);
    const bodyHor = Astronomy.Horizon(time, observer, bodyEq.ra, bodyEq.dec, "normal");
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
    const sunHor = Astronomy.Horizon(time, observer, sunEq.ra, sunEq.dec, "normal");
    const elongation = angularSeparation(bodyEq.ra, bodyEq.dec, sunEq.ra, sunEq.dec);

    return {
        body: {
            equator: bodyEq,
            horizon: bodyHor,
        },

        sun: {
            equator: sunEq,
            horizon: sunHor,
        },

        elongation,
    }
}