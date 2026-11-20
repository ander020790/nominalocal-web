const DAY = 86_400_000;
const iso = (date: Date) => date.toISOString().slice(0, 10);

const nextMonday = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const add = day === 1 ? 0 : (8 - day) % 7;
  copy.setDate(copy.getDate() + add);
  return copy;
};

const easterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
};

const cache = new Map<number, Set<string>>();

/** Festivos colombianos del año (fijos y con traslado al lunes). */
export const colombianHolidays = (year: number): Set<string> => {
  const cached = cache.get(year);
  if (cached) return cached;

  const days = new Set<string>();
  const add = (date: Date) => days.add(iso(date));
  const addFixed = (month: number, day: number) =>
    add(new Date(year, month - 1, day, 12));
  const addMoved = (month: number, day: number) =>
    add(nextMonday(new Date(year, month - 1, day, 12)));

  addFixed(1, 1);
  addFixed(5, 1);
  addFixed(7, 20);
  addFixed(8, 7);
  addFixed(12, 8);
  addFixed(12, 25);

  addMoved(1, 6);
  addMoved(3, 19);
  addMoved(6, 29);
  addMoved(8, 15);
  addMoved(10, 12);
  addMoved(11, 1);
  addMoved(11, 11);

  const easter = easterSunday(year);
  const offset = (days: number) =>
    new Date(easter.getTime() + days * DAY);
  add(offset(-3));
  add(offset(-2));
  add(nextMonday(offset(40)));
  add(nextMonday(offset(60)));
  add(nextMonday(offset(68)));

  cache.set(year, days);
  return days;
};

export const isBusinessDay = (date: Date) =>
  date.getDay() !== 0 && !colombianHolidays(date.getFullYear()).has(iso(date));

/** Días hábiles entre dos fechas (domingos y festivos no cuentan). */
export const businessDaysBetween = (startIso: string, endIso: string) => {
  if (!startIso || !endIso) return 0;
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  if (end < start) return 0;
  let count = 0;
  for (let time = start.getTime(); time <= end.getTime(); time += DAY) {
    if (isBusinessDay(new Date(time))) count += 1;
  }
  return count;
};
