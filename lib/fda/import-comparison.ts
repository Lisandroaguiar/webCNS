function comparableValue(key: string, value: unknown) {
  if (value == null) return "";
  const text = String(value);
  if (key === "start_time" || key === "end_time") {
    const time = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    return time ? `${time[1].padStart(2, "0")}:${time[2]}` : text;
  }
  return text;
}

export function importFieldsChanged(existing: Record<string, unknown> | null, next: Record<string, unknown>, keys: string[]) {
  return !existing || keys.some(key => comparableValue(key, existing[key]) !== comparableValue(key, next[key]));
}
