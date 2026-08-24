import * as Astronomy from "astronomy-engine";
import { angularSeparation } from "../astronomy/coordinates";
import { getLocalDay } from "../astronomy/time";
import { calculatePositions } from "../astronomy/positions";
import type { Target } from "../astronomy/targets";
import { visibilityScore } from "./scoring";
import type { ObservationDay, ObservationPoint } from "../types";
import { createSkyBrightnessCalculator } from "./skyBrightness";
import { OBSERVATION_CONFIG } from "../config/observationConfig";
import { skyQualityAt } from "./skyQuality";


Astronomy.DefineStar(Astronomy.Body.Star1, 6.752477, -16.716117, 8.6);

function truncate(input: string) {
	if (input.length > 16) {
		return input.substring(0, 16) + "...";
	}
	return input;
}

export async function calculateDay(
	target: Target,
	latitude: number,
	longitude: number,
	date: Date | string = new Date(),
	offsetDays = 0
): Promise<ObservationDay> {
	const localDay = getLocalDay(latitude, longitude, date).plus({ days: offsetDays });
	const observer = new Astronomy.Observer(latitude, longitude, 0);
	const points: ObservationPoint[] = [];

	for (let minute = 0; minute < 1440; minute += 1) {
		const localTime = localDay.plus({ minutes: minute });
		const astroTime = new Astronomy.AstroTime(localTime.toUTC().toJSDate());
		const positions = calculatePositions(target, astroTime, observer);

		const skyQuality = await skyQualityAt(latitude, longitude);
		const { skyBrightnessMag } = createSkyBrightnessCalculator(
			skyQuality?.sqmZenith ?? OBSERVATION_CONFIG.sky.sqmZenith
		);

		let moonInfo = null;

		if (target.name !== "Moon") {
			const moonEq = Astronomy.Equator(Astronomy.Body.Moon, astroTime, observer, true, true);
			const moonHor = Astronomy.Horizon(astroTime, observer, moonEq.ra, moonEq.dec, "normal");

			moonInfo = {
				altitude: moonHor.altitude,
				phaseAngle: Astronomy.Illumination(Astronomy.Body.Moon, astroTime).phase_angle,
				separation: angularSeparation(
					positions.body.equator.ra,
					positions.body.equator.dec,
					moonEq.ra,
					moonEq.dec
				),
			};
		}

		const sunDistanceAU = Astronomy.Illumination(Astronomy.Body.Sun, astroTime).geo_dist;

		const pole = Astronomy.Horizon(astroTime, observer, 0, 90);
		const siriusEq = Astronomy.Equator(Astronomy.Body.Star1, astroTime, observer, true, true);
		const sirius = Astronomy.Horizon(astroTime, observer, siriusEq.ra, siriusEq.dec);

		const magnitude = target.magnitude(astroTime);
		const distanceAU = target.geoDistance(astroTime, false);
		const distanceKm = target.geoDistance(astroTime, true);
		const constellation = Astronomy.Constellation(positions.body.equator.ra, positions.body.equator.dec).name;

		const result = visibilityScore(
			magnitude,
			positions.body.horizon.altitude,
			positions.sun.horizon.altitude,
			positions.elongation,
			moonInfo,
			skyBrightnessMag
		);

		points.push({
			minute,
			localTime,
			score: result.score,
			margin: result.margin,
			altitude: positions.body.horizon.altitude,
			azimuth: positions.body.horizon.azimuth,
			sunAltitude: positions.sun.horizon.altitude,
			sunAzimuth: positions.sun.horizon.azimuth,
			sunDistanceAU,
			poleAltAz: {
				altitude: pole.altitude,
				azimuth: pole.azimuth
			},
			siriusAltAz: {
				altitude: sirius.altitude,
				azimuth: sirius.azimuth
			},
			magnitude,
			distanceAU,
			distanceKm,
			constellation
		});
	}

	return {
		target,
		date: localDay,
		timezone: truncate(localDay.zoneName ?? "UTC"),
		points,
	};

}