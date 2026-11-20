import { formatDateLong } from "@/lib/format";
import { transportAllowanceFor } from "@/lib/payroll";
import { workedDays360 } from "@/lib/settlement";
import type { AccrualPayment, Company, Employee } from "@/data/types";

export type AccrualConcept =
  | "cesantias"
  | "vacaciones"
  | "prima"
  | "intereses";

export const ACCRUAL_LABELS: Record<AccrualConcept, string> = {
  cesantias: "Cesantías",
  vacaciones: "Vacaciones",
  prima: "Prima de servicios",
  intereses: "Intereses sobre cesantías",
};

export const ACCRUAL_TITLES: Record<AccrualConcept, string> = {
  cesantias: "PLANTILLA DE PAGO DE CESANTÍAS",
  vacaciones: "PLANTILLA DE PAGO DE VACACIONES",
  prima: "PLANTILLA DE PAGO DE PRIMA DE SERVICIOS",
  intereses: "PLANTILLA DE PAGO DE INTERESES SOBRE CESANTÍAS",
};

export const ACCRUAL_LEGAL: Record<AccrualConcept, string> = {
  intereses:
    "Artículo 253 del Código Sustantivo del Trabajo y Ley 52 de 1975: el empleador debe pagar intereses del 12% anual sobre las cesantías causadas, liquidados proporcionalmente al tiempo de servicio. Se pagan dentro de los primeros quince días de enero del año siguiente.",
  cesantias:
    "Artículo 249 y siguientes del Código Sustantivo del Trabajo: las cesantías equivalen a un salario mensual por cada año de servicio, o proporcional al tiempo laborado, liquidadas con el último salario devengado e incluyendo el auxilio de transporte. Deben consignarse al fondo de cesantías antes del 14 de febrero de cada año.",
  prima:
    "Artículo 306 del Código Sustantivo del Trabajo: la prima de servicios equivale a 30 días de salario por año, pagadera en dos cuotas (junio y diciembre) o proporcional al tiempo laborado en el semestre, incluyendo el auxilio de transporte.",
  vacaciones:
    "Artículos 186 y 189 del Código Sustantivo del Trabajo: el trabajador tiene derecho a 15 días hábiles de vacaciones remuneradas por cada año de servicio, compensables en dinero cuando el contrato termina o cuando se acuerda su pago. Las vacaciones se liquidan sobre el salario, sin incluir el auxilio de transporte.",
};

const atNoon = (value: string) => new Date(`${value}T12:00:00`);

export interface AccrualTemplate {
  concept: AccrualConcept;
  title: string;
  cutoff: string;
  periodLabel: string;
  days: number;
  salaryBase: number;
  transport: number;
  monthlyBase: number;
  baseForDisplay: number;
  formula: string;
  value: number;
  priorPayments: { label: string; detail: string; amount: number }[];
  priorTotal: number;
  net: number;
  legalText: string;
  reference: string;
}

export interface AccrualInput {
  cutoff: string;
  vacationDays?: number;
  priorPayments?: AccrualPayment[];
}

export const accruedVacationDays = (
  employee: Employee,
  cutoff: string,
  takenDays = 0,
) => {
  const start = atNoon(employee.startDate);
  const end = atNoon(cutoff);
  const days = workedDays360(start, end);
  return Math.max(0, Math.round(((days / 360) * 15 - takenDays) * 10) / 10);
};

export const calculateAccrual = (
  employee: Employee,
  company: Company,
  concept: AccrualConcept,
  input: AccrualInput,
  takenVacationDays = 0,
): AccrualTemplate => {
  const cutoff = input.cutoff;
  const end = atNoon(cutoff);
  const start = atNoon(employee.startDate);
  const yearStart = new Date(end.getFullYear(), 0, 1, 12);
  const semesterStart = new Date(
    end.getFullYear(),
    end.getMonth() <= 5 ? 0 : 6,
    1,
    12,
  );

  const salary = employee.salary;
  const transport = transportAllowanceFor(employee, company);
  const monthlyBase = salary + transport;

  let periodStart = start;
  let days = 0;
  let periodLabel = "";
  let formula = "";
  let value = 0;

  if (concept === "intereses") {
    periodStart = start > yearStart ? start : yearStart;
    days = workedDays360(periodStart, end);
    const cesantiasValue = (monthlyBase * days) / 360;
    const rate = company.params.interestCesantias;
    value = Math.round(cesantiasValue * rate * (days / 360));
    periodLabel = `${formatDateLong(periodStart.toISOString().slice(0, 10))} – ${formatDateLong(cutoff)}`;
    formula = `${formatCOPValue(cesantiasValue)} × ${(rate * 100).toFixed(0)}% × ${days} ÷ 360`;
  } else if (concept === "vacaciones") {
    // Si ya se pagaron vacaciones, el periodo vuelve a causar desde ese pago.
    const lastPayment = (input.priorPayments ?? [])
      .filter(
        (payment) => payment.concept === "vacaciones" && payment.paidAt,
      )
      .map((payment) => payment.paidAt)
      .sort()
      .pop();
    const accrualFrom =
      lastPayment && lastPayment > employee.startDate
        ? lastPayment
        : employee.startDate;
    const accrued =
      (workedDays360(atNoon(accrualFrom), end) / 360) * 15;
    const pending =
      input.vacationDays ??
      Math.max(0, Math.round((accrued - takenVacationDays) * 10) / 10);
    days = Math.max(0, pending);
    periodStart = atNoon(accrualFrom);
    value = Math.round((salary / 30) * days);
    periodLabel = `${formatDateLong(accrualFrom)} – ${formatDateLong(cutoff)}`;
    formula = `${days} días hábiles × ${formatCOPValue(salary)} ÷ 30 · sin auxilio`;
  } else {
    const lastPrimaPayment =
      concept === "prima"
        ? (input.priorPayments ?? [])
            .filter(
              (payment) => payment.concept === "prima" && payment.paidAt,
            )
            .map((payment) => atNoon(payment.paidAt))
            .sort((a, b) => a.getTime() - b.getTime())
            .pop()
        : undefined;
    const base =
      concept === "cesantias" ? yearStart : semesterStart;
    const primaBase = lastPrimaPayment ?? start;
    const effective = concept === "prima" ? primaBase : base;
    periodStart = start > effective ? start : effective;
    days = workedDays360(periodStart, end);
    value = Math.round((monthlyBase * days) / 360);
    periodLabel = `${formatDateLong(periodStart.toISOString().slice(0, 10))} – ${formatDateLong(cutoff)}`;
    formula =
      concept === "cesantias"
        ? `${formatCOPValue(monthlyBase)} × ${days} días ÷ 360`
        : `${formatCOPValue(monthlyBase)} × ${days} días ÷ 360 (semestre)`;
  }

  const labels: Record<AccrualConcept, string> = {
    cesantias: "Cesantías pagadas previamente",
    vacaciones: "Vacaciones pagadas previamente",
    prima: "Prima pagada previamente",
    intereses: "Intereses pagados previamente",
  };
  const priorPayments = (input.priorPayments ?? [])
    .filter((payment) => payment.concept === concept)
    // En vacaciones el periodo se reinicia en el último pago: no se descuenta
    // dos veces el valor ya pagado.
    .filter(
      () => concept !== "vacaciones" && concept !== "prima",
    )
    .map((payment) => ({
      label: labels[concept],
      detail: `${formatDateLong(payment.paidAt)}${payment.days ? ` · ${payment.days} días` : ""}${payment.notes ? ` · ${payment.notes}` : ""}`,
      amount: payment.amount,
    }));
  const priorTotal = priorPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  return {
    concept,
    title: ACCRUAL_TITLES[concept],
    cutoff,
    periodLabel,
    days,
    salaryBase: salary,
    transport,
    monthlyBase,
    baseForDisplay: concept === "vacaciones" ? salary : monthlyBase,
    formula,
    value,
    priorPayments,
    priorTotal,
    net: Math.max(0, value - priorTotal),
    legalText: ACCRUAL_LEGAL[concept],
    reference: `${concept === "cesantias" ? "CES" : concept === "prima" ? "PRI" : concept === "intereses" ? "INT" : "VAC"}-${cutoff.replace(/\W+/g, "")}-${employee.docNumber.replace(/\W+/g, "").slice(-4)}`,
  };
};

const copFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const formatCOPValue = (value: number) => `$${copFormatter.format(Math.round(value))}`;
