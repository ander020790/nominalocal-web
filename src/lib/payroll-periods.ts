import { businessDaysBetween } from "@/lib/holidays";
export interface PayrollSlot {
  period: string;
  fortnight: 1 | 2;
  label: string;
}

const monthName = (year: number, month: number) =>
  new Intl.DateTimeFormat("es-CO", { month: "long" }).format(
    new Date(year, month, 1),
  );

/**
 * Quincenas disponibles desde enero del año indicado hasta el mes actual.
 * Etiquetas tipo "enero 1 2026", "enero 2 2026".
 */
export const payrollSlots = (fromYear = 2026): PayrollSlot[] => {
  const now = new Date();
  const startYear = Math.min(fromYear, now.getFullYear());
  const slots: PayrollSlot[] = [];

  for (let year = startYear; year <= now.getFullYear(); year += 1) {
    for (let month = 0; month < 12; month += 1) {
      if (year === now.getFullYear() && month > now.getMonth()) break;
      const period = `${year}-${String(month + 1).padStart(2, "0")}`;
      const name = monthName(year, month);
      slots.push({
        period,
        fortnight: 1,
        label: `${name} 1 ${year}`,
      });
      // La segunda quincena aparece cuando ya comenzó (día 16 en adelante).
      if (year < now.getFullYear() || month < now.getMonth() || now.getDate() >= 16) {
        slots.push({
          period,
          fortnight: 2,
          label: `${name} 2 ${year}`,
        });
      }
    }
  }

  return slots.reverse();
};

export interface FortnightRange {
  start: string;
  end: string;
}

/** Rango de fechas de la quincena (mes comercial de 30 días). */
export const fortnightRange = (
  period: string,
  fortnight: 1 | 2,
): FortnightRange => ({
  start: `${period}-${fortnight === 1 ? "01" : "16"}`,
  end: `${period}-${fortnight === 1 ? "15" : "30"}`,
});

/** Rango calendario real de la quincena para consultar novedades. */
export const fortnightCalendarRange = (
  period: string,
  fortnight: 1 | 2,
): FortnightRange => {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    start: `${period}-${fortnight === 1 ? "01" : "16"}`,
    end:
      fortnight === 1
        ? `${period}-15`
        : `${period}-${String(lastDay).padStart(2, "0")}`,
  };
};

/** ¿El contrato del empleado tiene días dentro de la quincena? */
export const employeeInFortnight = (
  employee: { startDate: string; endDate?: string | null },
  period: string,
  fortnight: 1 | 2,
) => {
  const { start, end } = fortnightRange(period, fortnight);
  if (!employee.startDate || employee.startDate > end) return false;
  if (employee.endDate && employee.endDate < start) return false;
  return true;
};

/** Fecha de pago sugerida: 15 para Q1 y último día real del mes para Q2. */
export const defaultPaymentDate = (period: string, fortnight: 1 | 2) => {
  if (fortnight === 1) return `${period}-15`;
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${period}-${String(lastDay).padStart(2, "0")}`;
};

/**
 * Días laborados dentro de la quincena según el rango del contrato.
 * Usa días de mes comercial (30) para no generar fechas inválidas.
 */
export const workedDaysInFortnight = (
  employee: { startDate: string; endDate?: string | null },
  period: string,
  fortnight: 1 | 2,
) => {
  const startDay = fortnight === 1 ? 1 : 16;
  const endDay = fortnight === 1 ? 15 : 30;

  const startMonth = employee.startDate.slice(0, 7);
  const startOfMonth =
    startMonth === period
      ? Number(employee.startDate.slice(8, 10))
      : startMonth < period
        ? 1
        : 99;

  const endMonth = employee.endDate ? employee.endDate.slice(0, 7) : "";
  const endOfMonth = !endMonth
    ? 30
    : endMonth === period
      ? Math.min(30, Number(employee.endDate!.slice(8, 10)))
      : endMonth < period
        ? 0
        : 30;

  const from = Math.max(startOfMonth, startDay);
  const to = Math.min(endOfMonth, endDay);
  if (to < from) return 0;
  return Math.max(0, Math.min(15, to - from + 1));
};

/** Días de suspensión que se cruzan con la quincena. */
export const suspensionDaysInFortnight = (
  employeeId: string,
  suspensions: {
    employeeId: string;
    startDate: string;
    endDate: string;
    status: string;
  }[],
  period: string,
  fortnight: 1 | 2,
) => {
  const start = `${period}-${fortnight === 1 ? "01" : "16"}`;
  const end = `${period}-30`;
  return suspensions
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.status !== "cancelada" &&
        item.startDate <= end &&
        item.endDate >= start,
    )
    .reduce((sum, item) => {
      const from = item.startDate > start ? item.startDate : start;
      const to = item.endDate < end ? item.endDate : end;
      return sum + businessDaysBetween(from, to);
    }, 0);
};

/** Días de suspensión dentro de un rango de fechas (día comercial 30). */
export const suspensionDaysInRange = (
  employeeId: string,
  suspensions: {
    employeeId: string;
    startDate: string;
    endDate: string;
    status: string;
  }[],
  from: string,
  to: string,
) => {
  const end = to.endsWith("-31") ? `${to.slice(0, 8)}30` : to;
  return suspensions
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.status !== "cancelada" &&
        item.startDate <= end &&
        item.endDate >= from,
    )
    .reduce((sum, item) => {
      const start = item.startDate > from ? item.startDate : from;
      const finish = item.endDate < end ? item.endDate : end;
      return sum + businessDaysBetween(start, finish);
    }, 0);
};

/** Días hábiles de ausencias no remuneradas aprobadas en la quincena. */
export const unpaidDaysInFortnight = (
  employeeId: string,
  absences: {
    employeeId: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
  }[],
  period: string,
  fortnight: 1 | 2,
) => {
  const start = `${period}-${fortnight === 1 ? "01" : "16"}`;
  const end = `${period}-30`;
  return absences
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.type === "no-remunerada" &&
        item.status === "aprobada" &&
        item.startDate <= end &&
        item.endDate >= start,
    )
    .reduce((sum, item) => {
      const from = item.startDate > start ? item.startDate : start;
      const to = item.endDate < end ? item.endDate : end;
      return sum + businessDaysBetween(from, to);
    }, 0);
};

/** Días hábiles de incapacidad aprobados dentro de la quincena. */
export const incapacityDaysInFortnight = (
  employeeId: string,
  absences: {
    employeeId: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
  }[],
  period: string,
  fortnight: 1 | 2,
) => {
  const start = `${period}-${fortnight === 1 ? "01" : "16"}`;
  const end = `${period}-30`;
  return absences
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.type === "incapacidad" &&
        item.status === "aprobada" &&
        item.startDate <= end &&
        item.endDate >= start,
    )
    .reduce((sum, item) => {
      const from = item.startDate > start ? item.startDate : start;
      const to = item.endDate < end ? item.endDate : end;
      return sum + businessDaysBetween(from, to);
    }, 0);
};

/**
 * Días hábiles de vacaciones aprobadas dentro de la quincena. Se descuentan de
 * la nómina porque la remuneración de esos días se paga en la liquidación de
 * vacaciones, no dos veces en la nómina.
 */
export const vacationDaysInFortnight = (
  employeeId: string,
  absences: {
    employeeId: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
  }[],
  period: string,
  fortnight: 1 | 2,
) => {
  const start = `${period}-${fortnight === 1 ? "01" : "16"}`;
  const end = `${period}-30`;
  return absences
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.type === "vacaciones" &&
        item.status === "aprobada" &&
        item.startDate <= end &&
        item.endDate >= start,
    )
    .reduce((sum, item) => {
      const from = item.startDate > start ? item.startDate : start;
      const to = item.endDate < end ? item.endDate : end;
      return sum + businessDaysBetween(from, to);
    }, 0);
};
