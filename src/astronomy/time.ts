import tzlookup from "tz-lookup";
import { DateTime } from "luxon";


export function getLocalDay(
    latitude: number,
    longitude: number,
    date: Date | string
) {
    const timezone = tzlookup(
        latitude,
        longitude
    );

    const dateTime = typeof date === "string"
        ? DateTime.fromISO(date, { zone: timezone })
        : DateTime.fromJSDate(date).setZone(timezone);

    return dateTime
        .startOf("day");
}

export function getLocalDate(
    latitude: number,
    longitude: number,
    date: Date = new Date()
) {
    return getLocalDay(latitude, longitude, date).toISODate() ?? "";
}