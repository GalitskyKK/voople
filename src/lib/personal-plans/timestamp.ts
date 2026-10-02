/** ISO instants at PostgreSQL's exact microsecond precision; never round inputs. */
export function personalPlanInstant(value: string): bigint {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new RangeError("Invalid personal-plan timestamp");
  const calendar = Date.parse(`${match[1]}Z`);
  if (!Number.isFinite(calendar) || new Date(calendar).toISOString().slice(0, 19) !== match[1]) {
    throw new RangeError("Invalid personal-plan timestamp");
  }
  const milliseconds = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(milliseconds)) throw new RangeError("Invalid personal-plan timestamp");
  return BigInt(milliseconds) * BigInt(1000) + BigInt((match[2] ?? "").padEnd(6, "0"));
}
