export function parseSystemdUnit(source) {
  const sections = {};
  let current = null;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      current = line.slice(1, -1);
      sections[current] ??= {};
      continue;
    }
    const separator = line.indexOf("=");
    if (!current || separator < 1) throw new Error(`Invalid systemd unit line: ${line}`);
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1);
    sections[current][key] = value;
  }
  return sections;
}
