/** All time zones the browser knows, e.g. "Europe/Berlin" (built once). */
const ALL_ZONES = Intl.supportedValuesOf('timeZone');
export const TIMEZONES = ALL_ZONES.includes('UTC') ? ALL_ZONES : ['UTC', ...ALL_ZONES];

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
