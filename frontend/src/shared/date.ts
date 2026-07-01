export function formatLocalDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isDateOnlyString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseDateOnlyAsLocal(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function parseDateForDisplay(value: string): Date {
  return isDateOnlyString(value) ? parseDateOnlyAsLocal(value) : new Date(value);
}

export function getLocalDateKey(value: string): string {
  if (!value) return formatLocalDateYYYYMMDD(new Date());
  if (isDateOnlyString(value)) return value;
  return formatLocalDateYYYYMMDD(new Date(value));
}

export function formatDateLabel(
  value: string,
  options: Intl.DateTimeFormatOptions
): string {
  return parseDateForDisplay(value).toLocaleDateString("en-US", options);
}
