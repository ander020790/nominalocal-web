import type {
  AccrualPayment,
  Company,
  Employee,
  Payroll,
  PayrollLine,
} from "@/data/types";
import {
  calculateAccrual,
  type AccrualConcept,
} from "@/lib/accrual-template";
import { formatMonth, periodFromDate } from "@/lib/format";
import { calculatePayroll } from "@/lib/payroll";

export interface CostLine {
  label: string;
  detail?: string;
  amount: number;
}

export interface CostAccrual {
  concept: AccrualConcept;
  label: string;
  days: number;
  detail: string;
  value: number;
  paid: number;
  net: number;
}

export interface CostSummary {
  period: string;
  periodLabel: string;
  estimated: boolean;
  earnings: CostLine[];
  deductions: CostLine[];
  contributions: CostLine[];
  provisions: CostLine[];
  gross: number;
  deductionsTotal: number;
  net: number;
  employerTotal: number;
  payrollCost: number;
  accruals: CostAccrual[];
  interests: number;
  accrualsGross: number;
  accrualsPaid: number;
  accrualsNet: number;
  totalCost: number;
  cutoff: string;
}

export interface CostSummaryInput {
  cutoff: string;
  takenVacationDays?: number;
  priorPayments?: AccrualPayment[];
}

const toLine = (line: PayrollLine): CostLine => ({
  label: line.label,
  detail: line.detail,
  amount: line.amount,
});

const sum = (lines: CostLine[]) =>
  lines.reduce((total, line) => total + line.amount, 0);

/**
 * Une la nómina del periodo (devengos, deducciones y aportes patronales) con las
 * prestaciones sociales causadas al corte, sin duplicar las provisiones mensuales.
 */
export const buildCostSummary = (
  employee: Employee,
  company: Company,
  payroll: Payroll | null,
  input: CostSummaryInput,
): CostSummary => {
  const currentPeriod = periodFromDate(new Date());
  const lines = payroll
    ? payroll.lines
    : calculatePayroll(employee, company).lines;
  const period = payroll?.period ?? currentPeriod;

  const earnings = lines
    .filter((line) => line.kind === "earning")
    .map(toLine);
  const deductions = lines
    .filter((line) => line.kind === "deduction")
    .map(toLine);
  const contributions = lines
    .filter((line) => line.kind === "employer" && line.group === "aportes")
    .map(toLine);
  const provisions = lines
    .filter((line) => line.group === "provisiones")
    .map(toLine);

  const gross = sum(earnings);
  const deductionsTotal = sum(deductions);
  const net = gross - deductionsTotal;
  const employerTotal = sum(contributions);

  const priorPayments = input.priorPayments ?? [];
  const take = (concept: AccrualConcept) =>
    calculateAccrual(
      employee,
      company,
      concept,
      { cutoff: input.cutoff, priorPayments },
      input.takenVacationDays ?? 0,
    );

  const cesantias = take("cesantias");
  const prima = take("prima");
  const vacaciones = take("vacaciones");
  const intereses = take("intereses");

  const accruals: CostAccrual[] = [
    {
      concept: "cesantias",
      label: "Cesantías",
      days: cesantias.days,
      detail: `${cesantias.days} días · salario + auxilio ÷ 360`,
      value: cesantias.value,
      paid: cesantias.priorTotal,
      net: cesantias.net,
    },
    {
      concept: "intereses",
      label: "Intereses sobre cesantías",
      days: intereses.days,
      detail: `${(company.params.interestCesantias * 100).toFixed(0)}% anual proporcional`,
      value: intereses.value,
      paid: intereses.priorTotal,
      net: intereses.net,
    },
    {
      concept: "prima",
      label: "Prima de servicios",
      days: prima.days,
      detail: `${prima.days} días del semestre · salario + auxilio`,
      value: prima.value,
      paid: prima.priorTotal,
      net: prima.net,
    },
    {
      concept: "vacaciones",
      label: "Vacaciones",
      days: vacaciones.days,
      detail: `${vacaciones.days} días hábiles acumulados`,
      value: vacaciones.value,
      paid: vacaciones.priorTotal,
      net: vacaciones.net,
    },
  ];

  const accrualsGross = accruals.reduce(
    (total, accrual) => total + accrual.value,
    0,
  );
  const accrualsPaid = accruals.reduce(
    (total, accrual) => total + accrual.paid,
    0,
  );
  const accrualsNet = accruals.reduce(
    (total, accrual) => total + accrual.net,
    0,
  );
  const payrollCost = gross + employerTotal;

  return {
    period,
    periodLabel: formatMonth(period),
    estimated: !payroll,
    earnings,
    deductions,
    contributions,
    provisions,
    gross,
    deductionsTotal,
    net,
    employerTotal,
    payrollCost,
    accruals,
    interests: intereses.value,
    accrualsGross,
    accrualsPaid,
    accrualsNet,
    totalCost: payrollCost + accrualsNet,
    cutoff: input.cutoff,
  };
};
