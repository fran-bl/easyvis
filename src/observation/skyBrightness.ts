import type { MoonInfo } from "../types";
import { OBSERVATION_CONFIG } from "../config/observationConfig";


export function airmass(altitudeDeg: number) {
    const z = ((90.0 - Math.max(altitudeDeg, 0.0)) * Math.PI) / 180.0;
    return Math.pow(1.0 - 0.96 * Math.sin(z) ** 2, -0.5);
}

function magToNanolamberts(mag: number) {
    return 34.08 * Math.exp(20.7233 - mag * 0.92104);
}

function nanolambertsToMag(bNl: number) {
    return (20.7233 - Math.log(Math.max(bNl, 1e-9) / 34.08)) / 0.92104;
}

function moonScattering(rhoDeg: number) {
    const rho = Math.max(rhoDeg, 0.26);
    const fR = 10 ** 5.36 * (1.06 + Math.cos((rho * Math.PI) / 180.0) ** 2);
    const fM = rho >= 10.0 ? 10 ** (6.15 - rho / 40.0) : 6.2e7 / (rho ** 2);
    return fR + fM;
}

function moonIntensity(phaseAngleDeg: number) {
    const a = Math.abs(phaseAngleDeg);
    return 10 ** (-0.4 * (3.84 + 0.026 * a + 4e-9 * (a ** 4)));
}

function applyMoon(
    bTotal: number,
    objectAltitude: number,
    moonInfo: MoonInfo | null,
    k: number
) {
    if (!moonInfo || moonInfo.altitude <= 0) {
        return bTotal;
    }
    const xMoon = airmass(moonInfo.altitude);
    const xObj = airmass(objectAltitude);
    const iStar = moonIntensity(moonInfo.phaseAngle);
    const fRho = moonScattering(moonInfo.separation);
    const bMoon = fRho * iStar * 10 ** (-0.4 * k * xMoon) * (1 - 10 ** (-0.4 * k * xObj));
    return bTotal + bMoon;
}

function nightSkyBrightnessMag(
    objectAltitude: number,
    moonInfo: MoonInfo | null,
    k: number = OBSERVATION_CONFIG.sky.extinctionCoefficient,
    zenithMag: number = OBSERVATION_CONFIG.sky.sqmZenith
) {
    const bZen = magToNanolamberts(zenithMag);
    const xObj = airmass(objectAltitude);
    const b0 = bZen * 10 ** (-0.4 * k * (xObj - 1)) * xObj;
    const bTotal = applyMoon(b0, objectAltitude, moonInfo, k);
    return nanolambertsToMag(bTotal);
}

const TWILIGHT_SUN_ALT = [-18.0, -15.0, -12.0, -9.0, -6.0, -3.0, 0.0, 5.0, 10.0, 20.0, 40.0, 90.0];
const TWILIGHT_SKY_MAG = [OBSERVATION_CONFIG.sky.sqmZenith, 20.0, 19.3, 18.0, 16.3, 14.2, 10.7, 9.7, 4.5, 3.0, 2.5, 2.4];

function pchipPrepare(x: Array<number>, y: Array<number>) {
    const n = x.length;
    const h = new Array(n - 1);
    const delta = new Array(n - 1);
    for (let i = 0; i < n - 1; i += 1) {
        h[i] = x[i + 1] - x[i];
        delta[i] = (y[i + 1] - y[i]) / h[i];
    }

    const d = new Array(n).fill(0);

    for (let i = 1; i < n - 1; i += 1) {
        if (delta[i - 1] === 0 || delta[i] === 0 || Math.sign(delta[i - 1]) !== Math.sign(delta[i])) {
            d[i] = 0;
        } else {
            const w1 = 2 * h[i] + h[i - 1];
            const w2 = h[i] + 2 * h[i - 1];
            d[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
        }
    }

    const endpointSlope = (h0: number, h1: number, del0: number, del1: number) => {
        const m = ((2 * h0 + h1) * del0 - h0 * del1) / (h0 + h1);
        if (Math.sign(m) !== Math.sign(del0)) {
            return 0;
        }
        if (Math.sign(del0) !== Math.sign(del1) && Math.abs(m) > Math.abs(3 * del0)) {
            return 3 * del0;
        }
        return m;
    };

    d[0] = endpointSlope(h[0], h[1], delta[0], delta[1]);
    d[n - 1] = endpointSlope(h[n - 2], h[n - 3], delta[n - 2], delta[n - 3]);

    return { x, y, h, d };
}

function pchipEval(state: { x: Array<number>, y: Array<number>, h: Array<number>, d: Array<number> }, xq: number) {
    const { x, y, h, d } = state;
    const n = x.length;

    if (xq <= x[0]) {
        return y[0];
    }
    if (xq >= x[n - 1]) {
        return y[n - 1];
    }

    let i = 0;
    while (i < n - 2 && xq > x[i + 1]) {
        i += 1;
    }

    const t = (xq - x[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return h00 * y[i] + h10 * h[i] * d[i] + h01 * y[i + 1] + h11 * h[i] * d[i + 1];
}

const TWILIGHT_INTERPOLATOR = pchipPrepare(TWILIGHT_SUN_ALT, TWILIGHT_SKY_MAG);

function twilightZenithMag(sunAltitude: number) {
    const clamped = Math.max(-18.0, Math.min(90.0, sunAltitude));
    return pchipEval(TWILIGHT_INTERPOLATOR, clamped);
}

export function skyBrightnessMag(
    objectAltitude: number,
    sunAltitude: number,
    moonInfo: MoonInfo | null = null
) {
    if (sunAltitude <= -18.0) {
        return nightSkyBrightnessMag(objectAltitude, moonInfo);
    }

    const zen = twilightZenithMag(sunAltitude);
    const bZen = magToNanolamberts(zen);
    const xObj = airmass(objectAltitude);
    const b0 = bZen * 10 ** (-0.4 * OBSERVATION_CONFIG.sky.extinctionCoefficient * (xObj - 1)) * xObj;
    const bTotal = applyMoon(b0, objectAltitude, moonInfo, OBSERVATION_CONFIG.sky.extinctionCoefficient);
    return nanolambertsToMag(bTotal);
}