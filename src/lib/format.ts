const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const number = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
});

export const formatCOP = (value: number) => cop.format(Math.round(value));
export const formatNumber = (value: number) => number.format(Math.round(value));

export const formatPercent = (value: number, digits = 1) =>
  `${(value * 100).toLocaleString("es-CO", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })}%`;

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatDate = (iso: string) =>
  iso ? dateFormatter.format(new Date(`${iso}T12:00:00`)) : "—";

export const formatDateLong = (iso: string) =>
  iso
    ? new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${iso}T12:00:00`))
    : "—";

export const formatMonth = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
};

export const formatMonthShort = (period: string) => {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { month: "short" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");
};

export const initials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

export const fullName = (employee: {
  firstName: string;
  lastName: string;
}) => `${employee.firstName} ${employee.lastName}`;

export const periodFromDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export const lastPeriods = (count: number, from = new Date()) => {
  const periods: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = count - 1; i >= 0; i -= 1) {
    periods.push(
      periodFromDate(new Date(cursor.getFullYear(), cursor.getMonth() - i, 1)),
    );
  }
  return periods;
};

export const daysBetween = (start: string, end: string) => {
  const a = new Date(`${start}T12:00:00`).getTime();
  const b = new Date(`${end}T12:00:00`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
};

const UNITS = [
  "cero",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve",
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
  "veinte",
];

const TENS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
];

const HUNDREDS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
];

const belowHundred = (n: number): string => {
  if (n <= 20) return UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens === 2 && unit > 0) return `veinti${UNITS[unit]}`;
  return unit === 0 ? TENS[tens] : `${TENS[tens]} y ${UNITS[unit]}`;
};

const belowThousand = (n: number): string => {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const prefix = hundreds > 0 ? HUNDREDS[hundreds] : "";
  return [prefix, rest > 0 ? belowHundred(rest) : ""]
    .filter(Boolean)
    .join(" ");
};

/** Convierte un entero a letras en español (hasta miles de millones). */
export const numberToWords = (value: number): string => {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "cero";

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;
  const parts: string[] = [];

  if (millions > 0) {
    if (millions === 1) parts.push("un millón");
    else parts.push(`${belowThousand(millions)} millones`);
  }
  if (thousands > 0) {
    if (thousands === 1) parts.push("mil");
    else parts.push(`${belowThousand(thousands)} mil`);
  }
  if (units > 0) parts.push(belowThousand(units));

  return parts.join(" ");
};
