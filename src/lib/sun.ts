/**
 * Sunrise / sunset / solar noon, from the NOAA solar-calculator equations
 * (public domain). Accuracy within a few minutes — fine for dive planning,
 * not for navigation. Longitude uses the geographic convention: east
 * positive, west negative.
 */

const RAD = Math.PI / 180;
const JD_TO_MS = 86400000;
const UNIX_EPOCH_JD = 2440587.5;
const J2000 = 2451545.0;

export interface SunTimes {
  sunriseUtc?: Date;
  sunsetUtc?: Date;
  solarNoonUtc: Date;
  polar: "day" | "night" | null;
}

function jdToDate(jd: number): Date {
  return new Date((jd - UNIX_EPOCH_JD) * JD_TO_MS);
}

export function sunTimes(date: Date, lat: number, lng: number): SunTimes {
  const jd = date.getTime() / JD_TO_MS + UNIX_EPOCH_JD;
  const jdNoon = Math.round(jd);
  const jStar = jdNoon - lng / 360;

  const daysSinceJ2000 = jStar - J2000;
  const M = (357.5291 + 0.98560028 * daysSinceJ2000) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;

  const jTransit =
    jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);

  const sinDecl = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const decl = Math.asin(sinDecl);

  const cosHourAngle =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) /
    (Math.cos(lat * RAD) * Math.cos(decl));

  const solarNoonUtc = jdToDate(jTransit);

  if (cosHourAngle > 1) return { solarNoonUtc, polar: "night" };
  if (cosHourAngle < -1) return { solarNoonUtc, polar: "day" };

  const omega = Math.acos(cosHourAngle) / RAD;

  return {
    sunriseUtc: jdToDate(jTransit - omega / 360),
    sunsetUtc: jdToDate(jTransit + omega / 360),
    solarNoonUtc,
    polar: null,
  };
}

export function formatInZone(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
