import * as Astronomy from "astronomy-engine";
import { DateTime } from "luxon";
import { angularSeparation } from "../astronomy/coordinates";
import { getLocalDay } from "../astronomy/time";
import { calculatePositions } from "../astronomy/positions";
import type { Target } from "../astronomy/targets";
import { visibilityScore } from "./scoring";

export interface ObservationPoint {
	minute: number;
	localTime: DateTime;
	score: number;
	margin: number | null;
	altitude: number;
	azimuth: number;
	sunAltitude: number;
	sunAzimuth: number;
	magnitude: number;
}

export interface ObservationDay {
	target: Target;
	date: DateTime;
	timezone: string;
	points: ObservationPoint[];
}

function truncate(input: string) {
	if (input.length > 16) {
		return input.substring(0, 16) + '...';
	}
	return input;
}

export function calculateDay(
	target: Target,
	latitude: number,
	longitude: number,
	date: Date | string = new Date(),
	offsetDays = 0
): ObservationDay {
	const localDay = getLocalDay(latitude, longitude, date).plus({ days: offsetDays });
	const observer = new Astronomy.Observer(latitude, longitude, 0);
	const points: ObservationPoint[] = [];

	for (let minute = 0; minute < 1440; minute += 1) {
		const localTime = localDay.plus({ minutes: minute });
		const astroTime = new Astronomy.AstroTime(localTime.toUTC().toJSDate());
		const positions = calculatePositions(target, astroTime, observer);

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

		const magnitude = target.magnitude(astroTime);
		const result = visibilityScore(
			magnitude,
			positions.body.horizon.altitude,
			positions.sun.horizon.altitude,
			positions.elongation,
			moonInfo
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
			magnitude,
		});
	}

	return {
		target,
		date: localDay,
		timezone: truncate(localDay.zoneName ?? "UTC"),
		points,
	};

}