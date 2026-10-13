const locale = "es-BO";
let companyTimeZone: string | null = null;

export const setCompanyTimeZone = (timeZoneId?: string | null) => {
  if (!timeZoneId) {
    companyTimeZone = null;
    return;
  }
  try {
    new Intl.DateTimeFormat(locale, { timeZone: timeZoneId }).format();
    companyTimeZone = timeZoneId;
  } catch {
    companyTimeZone = null;
  }
};

export const getDisplayTimeZone = (preferredTimeZone?: string | null) =>
  preferredTimeZone ||
  companyTimeZone ||
  Intl.DateTimeFormat().resolvedOptions().timeZone ||
  "UTC";

const asDate = (value: string | Date) =>
  value instanceof Date ? value : new Date(value);

export const formatDate = (value?: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: getDisplayTimeZone(),
      }).format(asDate(value))
    : "—";

export const formatDateTime = (value?: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: getDisplayTimeZone(),
      }).format(asDate(value))
    : "—";

export const formatTime = (value?: string | Date | null) =>
  value
    ? new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: getDisplayTimeZone(),
      }).format(asDate(value))
    : "—";

export const localDayKey = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: getDisplayTimeZone(),
  }).format(asDate(value));

export const localDayStartUtc = (date: string) =>
  new Date(`${date}T00:00:00`).toISOString();

export const localDayEndUtc = (date: string) => {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + 1);
  return next.toISOString();
};

const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

/** "hace 5 min" or "hace 2 h" for the last hours; the full date and time beyond that. */
export const formatRelativeTime = (
  value?: string | Date | null,
  now = new Date(),
) => {
  if (!value) return "—";
  const minutes = Math.round((now.getTime() - asDate(value).getTime()) / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return relativeFormat.format(-minutes, "minute");
  if (minutes < 12 * 60)
    return relativeFormat.format(-Math.floor(minutes / 60), "hour");
  return formatDateTime(value);
};
