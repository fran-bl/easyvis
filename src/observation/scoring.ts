import type { MoonInfo } from "../types";
import { OBSERVATION_CONFIG } from "../config/observationConfig";
import { airmass, skyBrightnessMag } from "./skyBrightness";


const NELM_ANCHOR_DARK = [21.4, 6.0];
const NELM_ANCHOR_DAY = [2.4, -4.0];
const NELM_SLOPE = (NELM_ANCHOR_DARK[1] - NELM_ANCHOR_DAY[1]) / (NELM_ANCHOR_DARK[0] - NELM_ANCHOR_DAY[0]);
const NELM_INTERCEPT = NELM_ANCHOR_DARK[1] - NELM_SLOPE * NELM_ANCHOR_DARK[0];

function nakedEyeLimitingMagnitude(skyMag: number) {
  return NELM_SLOPE * skyMag + NELM_INTERCEPT;
}

export function visibilityScore(
  apparentMagnitude: number,
  objectAltitude: number,
  sunAltitude: number,
  elongation: number,
  moonInfo: MoonInfo | null = null
) {
  if (objectAltitude < OBSERVATION_CONFIG.visibility.minimumAltitude) {
    return { score: 0.0, margin: null };
  }

  const skyMag = skyBrightnessMag(objectAltitude, sunAltitude, moonInfo);
  const limitingMag = nakedEyeLimitingMagnitude(skyMag);

  const xObj = airmass(objectAltitude);
  const observedMagnitude = apparentMagnitude + OBSERVATION_CONFIG.sky.extinctionCoefficient * (xObj - 1);

  const twilightGate = Math.max(0.0, Math.min(1.0, (sunAltitude + 18.0) / 18.0));
  const glarePenalty = 6.0 * Math.exp(-elongation / OBSERVATION_CONFIG.visibility.glareScale) * twilightGate;

  const effectiveLimitingMag = limitingMag - glarePenalty;
  const margin = effectiveLimitingMag - observedMagnitude;

  const sigma = 0.4;
  const score = 1.0 / (1.0 + Math.exp(-margin / sigma));
  return { score, margin };
}