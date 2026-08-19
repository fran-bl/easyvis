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
	sunAltitude: number;
	magnitude: number;
}

export interface ObservationDay {
	target: Target;
	date: DateTime;
	timezone: string;
	points: ObservationPoint[];
}

export function calculateDay(
	target: Target,
	latitude: number,
	longitude: number,
	date: Date = new Date(),
	offsetDays = 0
): ObservationDay {
	const localDay = getLocalDay(latitude, longitude, date).plus({ days: offsetDays });
	const observer = new Astronomy.Observer(latitude, longitude, 0);
	const points: ObservationPoint[] = [];

	for (let minute = 0; minute < 1440; minute += 1) {
		const localTime = localDay.plus({ minutes: minute });
		const astroTime = new Astronomy.AstroTime(localTime.toUTC().toJSDate());
		const positions = calculatePositions(target, astroTime, observer);

		const moonEq = Astronomy.Equator(Astronomy.Body.Moon, astroTime, observer, true, true);
		const moonHor = Astronomy.Horizon(astroTime, observer, moonEq.ra, moonEq.dec, "normal");
		const moonInfo = {
			altitude: moonHor.altitude,
			phaseAngle: Astronomy.Illumination(Astronomy.Body.Moon, astroTime).phase_angle,
			separation: angularSeparation(
				positions.body.equator.ra,
				positions.body.equator.dec,
				moonEq.ra,
				moonEq.dec
			),
		};

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
			sunAltitude: positions.sun.horizon.altitude,
			magnitude,
		});
	}

	return {
		target,
		date: localDay,
		timezone: localDay.zoneName ?? "UTC",
		points,
	};

}