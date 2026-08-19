import tzlookup from "tz-lookup";
import { DateTime } from "luxon";


export function getLocalDay(
    latitude: number,
    longitude: number,
    date: Date
) {
    const timezone = tzlookup(
        latitude,
        longitude
    );

    return DateTime
        .fromJSDate(date)
        .setZone(timezone)
        .startOf("day");
}