export type DateRangeSelection = {
  start: string | null;
  end: string | null;
};

export type CalendarCell = {
  key: string;
  date: Date;
  inMonth: boolean;
  past: boolean;
  available: boolean;
  selected: boolean;
  inRange: boolean;
};

export function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getDatesBetween(startIso: string, endIso: string): string[] {
  const start = parseDateKey(startIso);
  const end = parseDateKey(endIso);
  if (!start || !end) return [];
  const entries: string[] = [];
  const cursor = startOfDay(new Date(start));
  const final = startOfDay(new Date(end));
  while (cursor <= final) {
    entries.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return entries;
}

export function getAvailabilityDates(
  availableFrom: string | null,
  availableUntil: string | null,
): string[] {
  if (!availableFrom || !availableUntil) return [];
  const start = parseDateKey(availableFrom.slice(0, 10));
  const end = parseDateKey(availableUntil.slice(0, 10));
  if (!start || !end) return [];
  return getDatesBetween(toDateKey(start), toDateKey(end));
}

export function getMonthGrid(
  month: Date,
  availableDates: string[],
  selection: DateRangeSelection,
): CalendarCell[] {
  const availableSet = new Set(availableDates);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstVisibleDay = new Date(monthStart);
  firstVisibleDay.setDate(firstVisibleDay.getDate() - firstVisibleDay.getDay());

  const today = startOfDay(new Date());
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);
    const key = toDateKey(date);
    const selected = Boolean(
      (selection.start && key === selection.start) ||
      (selection.end && key === selection.end),
    );
    const inRange = Boolean(
      selection.start &&
      selection.end &&
      key >= selection.start &&
      key <= selection.end,
    );

    cells.push({
      key,
      date,
      inMonth: date.getMonth() === monthStart.getMonth(),
      past: startOfDay(date) < today,
      available: availableSet.has(key),
      selected,
      inRange,
    });
  }

  return cells;
}

export function formatRangeSummary(selection: DateRangeSelection): string {
  if (!selection.start && !selection.end) return "No dates selected";
  const start = selection.start ? parseDateKey(selection.start) : null;
  const end = selection.end ? parseDateKey(selection.end) : start;
  if (!start || !end) return "Select a date";
  if (selection.start === selection.end) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(start);
  }
  return `${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(start)} → ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(end)}`;
}

export function formatFullDate(value: string | null): string {
  if (!value) return "Not set";
  const date = parseDateKey(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
