const EXPLICIT_TIME_ZONE_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;
const ISO_DATE_TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Legacy Postgres `timestamp without time zone` columns are stored in UTC but
 * serialized without a suffix. Make UTC explicit before formatting in a
 * browser; already-zoned timestamps are preserved.
 */
export function parseDatabaseDate(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getTime());

  const normalized =
    ISO_DATE_TIME_WITHOUT_ZONE.test(value) && !EXPLICIT_TIME_ZONE_SUFFIX.test(value)
      ? `${value}Z`
      : value;

  return new Date(normalized);
}
