import { formatDate } from "@/lib/format";
import { transportAllowanceFor } from "@/lib/payroll";
import type {
  Absence,
  AccrualPayment,
  Company,
  Employee,
} from "@/data/types";

export interface SettlementInput {
  pendingSalaryDays: number;
  terminationReason?: string;
  vacationDays: number;
  otherEarnings: number;
  otherDeductions: number;
  priorPayments?: AccrualPayment[];
}

export interface SettlementLine {
  label: string;
  detail: string;
  amount: number;
}

export interface SettlementPriorPayment {
  label: string;
  detail: string;
  amount: number;
}

export interface SettlementResult {
  lines: SettlementLine[];
  priorPayments: SettlementPriorPayment[];
  gross: number;
  legalDeductions: number;
  priorTotal: number;
  totalDeductions: number;
  net: number;
  daysYear: number;
  daysSemester: number;
  suggestedVacationDays: number;
}

const DAY = 86_400_000;

const diffDays = (start: Date, end: Date) =>
  Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY) + 1);

/**
 * Días laborales con año de 360 días (12 meses de 30). Un año completo
 * (1 de enero a 31 de diciembre) cuenta exactamente 360 días.
 */
export const workedDays360 = (start: Date, end: Date) => {
  if (end.getTime() < start.getTime()) return 0;
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  const remainder =
    end.getDate() >= start.getDate()
      ? end.getDate() - start.getDate() + 1
      : end.getDate() + 1;
  return Math.max(0, months * 30 + Math.min(remainder, 30));
};

const atNoon = (value: string) => new Date(`${value}T12:00:00`);

export const vacationDaysTaken = (
  employeeId: string,
  absences: Absence[],
) =>
  absences
    .filter(
      (absence) =>
        absence.employeeId === employeeId &&
        absence.type === "vacaciones" &&
        absence.status === "aprobada",
    )
    .reduce((sum, absence) => sum + absence.days, 0);

/**
 * Días de salario pendientes del mes de corte. Si el contrato inició dentro del
 * mes, se cuenta desde la fecha de ingreso; si la nómina del periodo ya existe,
 * no hay días pendientes.
 */
export const suggestedPendingSalaryDays = (
  employee: Employee,
  payrolls: { employeeId: string; period: string }[],
  cutoff?: string,
) => {
  const endDate =
    cutoff ?? employee.endDate ?? new Date().toISOString().slice(0, 10);
  const endPeriod = endDate.slice(0, 7);
  const alreadyLiquidated = payrolls.some(
    (payroll) =>
      payroll.employeeId === employee.id && payroll.period === endPeriod,
  );
  if (alreadyLiquidated) return 0;

  const monthStart = `${endPeriod}-01`;
  const from =
    employee.startDate && employee.startDate > monthStart
      ? employee.startDate
      : monthStart;
  if (from > endDate) return 0;
  return Math.min(30, Math.max(1, diffDays(atNoon(from), atNoon(endDate))));
};

/** Fecha del último pago de vacaciones: desde ahí se vuelven a causar días. */
export const lastVacationPaymentDate = (
  employeeId: string,
  payments: AccrualPayment[],
) => {
  const dates = payments
    .filter(
      (payment) =>
        payment.employeeId === employeeId &&
        payment.concept === "vacaciones" &&
        payment.paidAt,
    )
    .map((payment) => payment.paidAt)
    .sort();
  return dates.length > 0 ? dates[dates.length - 1] : null;
};

/** Inicio del periodo de causación de vacaciones (contrato o último pago). */
export const vacationAccrualStart = (
  employee: Employee,
  payments: AccrualPayment[],
) => {
  const last = lastVacationPaymentDate(employee.id, payments);
  return last && last > employee.startDate ? last : employee.startDate;
};

/** Días de vacaciones disfrutados desde una fecha (inclusive). */
export const vacationDaysTakenSince = (
  employeeId: string,
  absences: Absence[],
  from?: string | null,
) =>
  absences
    .filter(
      (absence) =>
        absence.employeeId === employeeId &&
        absence.type === "vacaciones" &&
        absence.status === "aprobada" &&
        (!from || absence.startDate >= from),
    )
    .reduce((sum, absence) => sum + absence.days, 0);

export const suggestedVacationDays = (
  employee: Employee,
  takenDays = 0,
  from?: string | null,
) => {
  const end = atNoon(employee.endDate ?? new Date().toISOString().slice(0, 10));
  const startDate =
    from && from > employee.startDate ? from : employee.startDate;
  const start = atNoon(startDate);
  const days = workedDays360(start, end);
  const accrued = (days / 360) * 15;
  return Math.max(0, Math.round((accrued - takenDays) * 10) / 10);
};

export const calculateSettlement = (
  employee: Employee,
  company: Company,
  input: SettlementInput,
  takenVacationDays = 0,
  vacationFrom?: string | null,
): SettlementResult => {
  const endDate = employee.endDate
    ? atNoon(employee.endDate)
    : new Date();
  const startDate = atNoon(employee.startDate);
  const yearStart = new Date(endDate.getFullYear(), 0, 1, 12);
  const effectiveStart = startDate > yearStart ? startDate : yearStart;
  const daysYear = workedDays360(effectiveStart, endDate);

  const semesterStart = new Date(
    endDate.getFullYear(),
    endDate.getMonth() <= 5 ? 0 : 6,
    1,
    12,
  );
  // Sin pagos previos, la prima se causa desde el inicio del contrato; si ya
  // hubo pagos, desde el último pago registrado.
  const lastPrimaPayment = (input.priorPayments ?? [])
    .filter((payment) => payment.concept === "prima" && payment.paidAt)
    .map((payment) => atNoon(payment.paidAt))
    .sort((a, b) => a.getTime() - b.getTime())
    .pop();
  const semesterBase = lastPrimaPayment ?? startDate;
  const effectiveSemesterStart =
    startDate > semesterBase ? startDate : semesterBase;
  const daysSemester = workedDays360(effectiveSemesterStart, endDate);

  const salary = employee.salary;
  const transport = transportAllowanceFor(employee, company);
  const baseWithTransport = salary + transport;
  const pendingDays = Math.max(0, input.pendingSalaryDays);
  const pendingSalary = (salary / 30) * pendingDays;
  const pendingTransport = transport > 0 ? (transport / 30) * pendingDays : 0;
  const vacation = (salary / 30) * Math.max(0, input.vacationDays);
  const cesantias = (baseWithTransport * daysYear) / 360;
  const intereses = cesantias * 0.12 * (daysYear / 360);
  const prima = (baseWithTransport * daysSemester) / 360;
  const other = Math.max(0, input.otherEarnings);

  // Indemnización por despido sin justa causa (art. 64 C.S.T.).
  const smmlv = company.params.smmlv;
  const serviceYears = workedDays360(startDate, endDate) / 360;
  let indemnityDays = 0;
  if (input.terminationReason === "despido-sin-justa-causa") {
    if (employee.contractType === "indefinido") {
      const highSalary = smmlv > 0 && salary >= smmlv * 10;
      const base = highSalary ? 20 : 30;
      const extra = highSalary ? 15 : 20;
      indemnityDays =
        serviceYears >= 1 ? base + extra * (serviceYears - 1) : base * serviceYears;
    } else if (employee.contractType === "fijo") {
      const remaining = employee.endDate
        ? diffDays(endDate, atNoon(employee.endDate))
        : 0;
      indemnityDays = Math.max(15, remaining);
    } else if (employee.contractType === "obra-labor") {
      indemnityDays = 15;
    }
  }
  const indemnity = Math.round((salary / 30) * indemnityDays);

  const lines: SettlementLine[] = [
    {
      label: "Salario pendiente",
      detail: `${input.pendingSalaryDays} días`,
      amount: Math.round(pendingSalary),
    },
    {
      label: "Vacaciones pendientes",
      detail: `${input.vacationDays} días hábiles · salario ÷ 30 (sin auxilio de transporte)`,
      amount: Math.round(vacation),
    },
    {
      label: "Cesantías",
      detail: `${daysYear} días · salario + auxilio ÷ 360`,
      amount: Math.round(cesantias),
    },
    {
      label: "Intereses sobre cesantías",
      detail: "12% anual proporcional",
      amount: Math.round(intereses),
    },
    {
      label: "Prima de servicios",
      detail: `${daysSemester} días causados · salario + auxilio`,
      amount: Math.round(prima),
    },
  ];

  if (pendingTransport > 0) {
    lines.push({
      label: "Auxilio de transporte (salario pendiente)",
      detail: `${pendingDays} días · no aplica a vacaciones`,
      amount: Math.round(pendingTransport),
    });
  }

  if (indemnity > 0) {
    lines.push({
      label: "Indemnización por despido",
      detail: `${Math.round(indemnityDays * 10) / 10} días · art. 64 C.S.T. (sin justa causa)`,
      amount: indemnity,
    });
  }

  if (other > 0) {
    lines.push({
      label: "Otros devengos",
      detail: "Valor adicional",
      amount: Math.round(other),
    });
  }

  const gross = lines.reduce((sum, line) => sum + line.amount, 0);
  // Salud y pensión se descuentan sobre lo efectivamente devengado: salario
  // pendiente, vacaciones compensadas y otros devengos. Cesantías, intereses
  // y prima no llevan aportes del trabajador.
  const contributionBase = pendingSalary + vacation + other;
  const legalDeductions = Math.round(
    contributionBase *
      (company.params.healthEmployee + company.params.pensionEmployee),
  );
  const conceptLabels: Record<AccrualPayment["concept"], string> = {
    cesantias: "Cesantías pagadas previamente",
    vacaciones: "Vacaciones pagadas previamente",
    prima: "Prima pagada previamente",
    intereses: "Intereses pagados previamente",
  };
  const priorPayments: SettlementPriorPayment[] = (
    input.priorPayments ?? []
  )
    // Las vacaciones ya pagadas reinician el conteo de días: no se descuentan
    // de nuevo para no pagar dos veces lo mismo.
    .filter(
      (payment) =>
        payment.concept !== "vacaciones" && payment.concept !== "prima",
    )
    .map((payment) => ({
      label: conceptLabels[payment.concept],
      detail: `${formatDate(payment.paidAt)}${payment.days ? ` · ${payment.days} días` : ""}${payment.notes ? ` · ${payment.notes}` : ""}`,
      amount: payment.amount,
    }));
  const priorTotal = priorPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const totalDeductions =
    legalDeductions +
    Math.max(0, input.otherDeductions) +
    priorTotal;

  return {
    lines,
    priorPayments,
    gross,
    legalDeductions,
    priorTotal,
    totalDeductions,
    net: gross - totalDeductions,
    daysYear,
    daysSemester,
    suggestedVacationDays: suggestedVacationDays(
      employee,
      takenVacationDays,
      vacationFrom,
    ),
  };
};
