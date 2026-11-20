import type {
  Company,
  Employee,
  Payroll,
  PayrollLine,
} from "@/data/types";
import { workedDaysInFortnight } from "@/lib/payroll-periods";

export interface PayrollExtra {
  label: string;
  amount: number;
  detail?: string;
  taxable?: boolean;
  cotizable?: boolean;
  prestacional?: boolean;
}

/** Auxilio de transporte aplicable según salario, tipo de salario y empresa. */
export const transportAllowanceFor = (
  employee: Employee,
  company: Company,
) =>
  employee.transportAllowance &&
  !employee.integralSalary &&
  employee.salary <= company.params.smmlv * 2
    ? company.params.transportAllowance
    : 0;

/** Salario base más auxilio de transporte (no constitutivo de salario). */
export const monthlyCompensation = (employee: Employee, company: Company) =>
  employee.salary + transportAllowanceFor(employee, company);

export interface PayrollResult {
  lines: PayrollLine[];
  ibc: number;
  gross: number;
  deductionsTotal: number;
  net: number;
  employerTotal: number;
  totalCost: number;
}

const round = (value: number) => Math.round(value);

const RETENTION_TABLE = [
  { from: 0, to: 95, rate: 0, add: 0 },
  { from: 95, to: 150, rate: 0.19, add: 0 },
  { from: 150, to: 360, rate: 0.28, add: 10 },
  { from: 360, to: 640, rate: 0.33, add: 69 },
  { from: 640, to: 945, rate: 0.35, add: 162 },
  { from: 945, to: 2300, rate: 0.37, add: 268 },
  { from: 2300, to: Infinity, rate: 0.39, add: 770 },
];

/** Retención en la fuente estimada (art. 383 ET) sobre base mensual depurada. */
export const estimateRetention = (taxableBase: number, uvt: number) => {
  if (taxableBase <= 0) return 0;
  const baseInUvt = taxableBase / uvt;
  const bracket = RETENTION_TABLE.find(
    (item) => baseInUvt > item.from && baseInUvt <= item.to,
  );
  if (!bracket || bracket.rate === 0) return 0;
  const inUvt = bracket.rate * (baseInUvt - bracket.from) + bracket.add;
  return Math.max(0, round(inUvt * uvt));
};

/** Nómina pagada más reciente del empleado. */
export const lastPaidPayroll = (
  employee: Employee,
  payrolls: Payroll[],
): Payroll | null => {
  const own = payrolls
    .filter(
      (payroll) =>
        payroll.employeeId === employee.id && payroll.status === "pagado",
    )
    .sort((a, b) =>
      `${a.period}-${a.fortnight}`.localeCompare(`${b.period}-${b.fortnight}`),
    );
  return own[own.length - 1] ?? null;
};

/**
 * Último salario devengado: base de la nómina más reciente ya pagada.
 * Si aún no tiene pagos de nómina, se usa el salario de la ficha.
 */
export const lastEarnedSalary = (
  employee: Employee,
  payrolls: Payroll[],
): number => {
  const last = lastPaidPayroll(employee, payrolls);
  if (!last) return employee.salary;

  const baseLine = last.lines.find(
    (line) =>
      line.kind === "earning" &&
      (line.label === "Salario base" || line.label === "Salario integral"),
  );
  if (!baseLine || baseLine.amount <= 0) return employee.salary;

  const days =
    last.daysWorked && last.daysWorked > 0
      ? last.daysWorked
      : workedDaysInFortnight(employee, last.period, last.fortnight);
  if (days <= 0) return employee.salary;
  if (days >= 28) return baseLine.amount;

  const monthly = Math.round((baseLine.amount * 30) / days);
  // Evita duplicar un recibo de mes completo que no traiga los días.
  return monthly > employee.salary * 1.5 ? baseLine.amount : monthly;
};

export const calculatePayroll = (
  employee: Employee,
  company: Company,
  extras: PayrollExtra[] = [],
  days = 30,
  fortnight?: 1 | 2,
): PayrollResult => {
  const p = company.params;
  // Factor de prorrateo para quincenas (15 días) o periodos parciales.
  const factor = Math.min(30, Math.max(1, days)) / 30;
  const lines: PayrollLine[] = [];
  const add = (line: Omit<PayrollLine, "id">) =>
    lines.push({ ...line, id: `${line.group}-${lines.length}-${Date.now()}` });

  const base = employee.salary * factor;
  add({
    kind: "earning",
    group: "devengo",
    label: employee.integralSalary ? "Salario integral" : "Salario base",
    amount: round(base),
  });

  const transportAllowance = transportAllowanceFor(employee, company) * factor;

  if (transportAllowance > 0) {
    add({
      kind: "earning",
      group: "devengo",
      label: "Auxilio de transporte",
      amount: round(transportAllowance),
      detail: "No constitutivo de salario",
    });
  }

  const motoAllowance =
    employee.motoAllowance && (p.motoAllowance ?? 0) > 0
      ? (p.motoAllowance ?? 0) * factor
      : 0;
  if (motoAllowance > 0) {
    add({
      kind: "earning",
      group: "devengo",
      label: "Auxilio de moto",
      amount: round(motoAllowance),
      detail: "No constitutivo de salario",
    });
  }

  employee.fixedEarnings.forEach((item) => {
    add({
      kind: "earning",
      group: "devengo",
      label: item.label,
      amount: round(item.amount * factor),
    });
  });

  extras.forEach((item) => {
    add({
      kind: "earning",
      group: "devengo",
      label: item.label,
      amount: round(item.amount),
      detail: item.detail,
    });
  });

  // La base de cotización (IBC) se calcula sobre el total devengado del
  // período: salario + todos los devengos adicionales (no incluye el auxilio
  // de transporte, que ya está fuera de la base).
  const cotizableExtras = extras
    .filter((item) => item.cotizable !== false)
    .reduce((sum, item) => sum + item.amount, 0);

  const taxableExtras = extras
    .filter((item) => item.taxable !== false)
    .reduce((sum, item) => sum + item.amount, 0);

  // Los ingresos fijos se clasifican individualmente.
  // Por defecto, los conceptos salariales son cotizables y prestacionales.
  const fixedEarningsCotizable = employee.fixedEarnings
    .filter((item) => item.cotizable ?? item.nature !== "no-salarial")
    .reduce((sum, item) => sum + item.amount * factor, 0);

  const fixedEarningsTaxable = employee.fixedEarnings
    .filter((item) => item.taxable !== false)
    .reduce((sum, item) => sum + item.amount * factor, 0);

  const fixedEarningsPrestacional = employee.fixedEarnings
    .filter((item) => item.prestacional ?? item.nature !== "no-salarial")
    .reduce((sum, item) => sum + item.amount * factor, 0);

  const taxableGross =
    base +
    fixedEarningsTaxable +
    taxableExtras;

  const ibc = employee.integralSalary
    ? round(base * 0.7)
    : round(base + fixedEarningsCotizable + cotizableExtras);

  const health = round(ibc * p.healthEmployee);
  const pension = round(ibc * p.pensionEmployee);
  const solidarityBase = ibc - p.smmlv * p.solidarityThreshold;
  const solidarity =
    solidarityBase > 0 ? round(solidarityBase * p.solidarityRate) : 0;

  const gross = lines
    .filter((line) => line.kind === "earning")
    .reduce((sum, line) => sum + line.amount, 0);

  const exemptCap = (790 * p.uvt) / 12;
  const exempt = Math.min(taxableGross * 0.25, exemptCap);
  const taxableBase =
    taxableGross - health - pension - solidarity - exempt;
  const retention = estimateRetention(taxableBase, p.uvt);

  add({
    kind: "deduction",
    group: "deduccion",
    label: "Salud (4%)",
    amount: health,
    detail: `${employee.eps || "EPS sin registrar"} · IBC ${ibc.toLocaleString("es-CO")}`,
  });
  add({
    kind: "deduction",
    group: "deduccion",
    label: "Pensión (4%)",
    amount: pension,
    detail: employee.pensionFund || "Fondo sin registrar",
  });
  if (solidarity > 0) {
    add({
      kind: "deduction",
      group: "deduccion",
      label: "Fondo de solidaridad pensional",
      amount: solidarity,
    });
  }
  if (retention > 0) {
    add({
      kind: "deduction",
      group: "deduccion",
      label: "Retención en la fuente",
      amount: retention,
    });
  }
  employee.fixedDeductions.forEach((item) => {
    let amount = round(item.amount);

    if (fortnight !== undefined && item.schedule) {
      if (item.schedule === "first") {
        amount = fortnight === 1 ? round(item.amount) : 0;
      } else if (item.schedule === "second") {
        amount = fortnight === 2 ? round(item.amount) : 0;
      } else if (item.schedule === "both") {
        const firstHalf = Math.ceil(item.amount / 2);
        amount = fortnight === 1
          ? firstHalf
          : round(item.amount) - firstHalf;
      }
    }

    if (amount > 0) {
      add({
        kind: "deduction",
        group: "deduccion",
        label: item.label,
        amount,
      });
    }
  });

  add({
    kind: "employer",
    group: "aportes",
    label: p.exonerated ? "Salud (exonerada)" : "Salud",
    amount: p.exonerated ? 0 : round(ibc * p.healthEmployer),
    detail: employee.eps || "EPS sin registrar",
  });
  add({
    kind: "employer",
    group: "aportes",
    label: "Pensión",
    amount: round(ibc * p.pensionEmployer),
    detail: employee.pensionFund || "Fondo sin registrar",
  });
  add({
    kind: "employer",
    group: "aportes",
    label: `ARL nivel ${employee.riskLevel}`,
    amount: round(ibc * p.arl[employee.riskLevel]),
    detail: employee.arlProvider || "ARL sin registrar",
  });
  add({
    kind: "employer",
    group: "aportes",
    label: "Caja de compensación",
    amount: round(ibc * p.compensationFund),
    detail: employee.compensationFund || "Caja sin registrar",
  });
  if (!p.exonerated) {
    add({
      kind: "employer",
      group: "aportes",
      label: "SENA",
      amount: round(ibc * p.sena),
    });
    add({
      kind: "employer",
      group: "aportes",
      label: "ICBF",
      amount: round(ibc * p.icbf),
    });
  }

  const provisionBase =
    base +
    fixedEarningsPrestacional +
    extras
      .filter((item) => item.prestacional !== false)
      .reduce((sum, item) => sum + item.amount, 0);

  if (!employee.integralSalary) {
    // Cesantías y prima incluyen el auxilio de transporte; vacaciones no.
    const provisionBaseWithTransport = provisionBase + transportAllowance;
    const cesantias = round(provisionBaseWithTransport * p.cesantias);
    add({
      kind: "employer",
      group: "provisiones",
      label: "Cesantías",
      amount: cesantias,
      detail:
        transportAllowance > 0
          ? "Causación mensual · incluye auxilio de transporte"
          : "Causación mensual",
    });
    add({
      kind: "employer",
      group: "provisiones",
      label: "Intereses sobre cesantías",
      amount: round(cesantias * p.interestCesantias),
    });
    add({
      kind: "employer",
      group: "provisiones",
      label: "Prima de servicios",
      amount: round(provisionBaseWithTransport * p.prima),
    });
    add({
      kind: "employer",
      group: "provisiones",
      label: "Vacaciones",
      amount: round(provisionBase * p.vacaciones),
      detail: "Sobre salario, sin auxilio de transporte",
    });
  }

  const deductionsTotal = lines
    .filter((line) => line.kind === "deduction")
    .reduce((sum, line) => sum + line.amount, 0);
  const employerTotal = lines
    .filter((line) => line.kind === "employer")
    .reduce((sum, line) => sum + line.amount, 0);

  const net = gross - deductionsTotal;

  return {
    lines,
    ibc,
    gross,
    deductionsTotal,
    net,
    employerTotal,
    totalCost: gross + employerTotal,
  };
};

export interface PayrollNovelties {
  overtimeDayHours: number;
  overtimeNightHours: number;
  nightHours: number;
  holidayHours: number;
  bonus: number;
  foodAllowance: number;
}

export const emptyNovelties = (): PayrollNovelties => ({
  overtimeDayHours: 0,
  overtimeNightHours: 0,
  nightHours: 0,
  holidayHours: 0,
  bonus: 0,
  foodAllowance: 0,
});

export const monthlyHoursFor = (company: Company) => {
  const weekly = company.params.weeklyHours || 42;
  return Math.max(1, Math.round((weekly / 6) * 30));
};

export const hourlyRateFor = (employee: Employee, company: Company) =>
  employee.salary / monthlyHoursFor(company);

export interface NoveltyBreakdown {
  hourlyRate: number;
  extraDay: number;
  extraNight: number;
  nightSurcharge: number;
  holiday: number;
  bonus: number;
  foodAllowance: number;
  total: number;
  extras: PayrollExtra[];
}

/** Calcula horas extra, bonificación y auxilio de alimentación del periodo. */
export const calculateNovelties = (
  employee: Employee,
  company: Company,
  novelties: PayrollNovelties,
): NoveltyBreakdown => {
  const p = company.params;
  const hourlyRate = hourlyRateFor(employee, company);
  const extraDay = Math.round(
    hourlyRate * (1 + p.extraDaySurcharge) * novelties.overtimeDayHours,
  );
  const extraNight = Math.round(
    hourlyRate * (1 + p.extraNightSurcharge) * novelties.overtimeNightHours,
  );
  const nightSurcharge = Math.round(
    hourlyRate * p.nightSurcharge * novelties.nightHours,
  );
  const holiday = Math.round(
    hourlyRate * (1 + p.sundayHolidaySurcharge) * novelties.holidayHours,
  );
  const bonus = Math.max(0, Math.round(novelties.bonus));
  const foodAllowance = Math.max(0, Math.round(novelties.foodAllowance));

  const extras: PayrollExtra[] = [];
  if (extraDay > 0) {
    extras.push({
      label: "Horas extra diurnas",
      amount: extraDay,
      detail: `${novelties.overtimeDayHours} h · recargo ${Math.round(p.extraDaySurcharge * 100)}%`,
      cotizable: true,
      prestacional: true,
      taxable: true,
    });
  }
  if (extraNight > 0) {
    extras.push({
      label: "Horas extra nocturnas",
      amount: extraNight,
      detail: `${novelties.overtimeNightHours} h · recargo ${Math.round(p.extraNightSurcharge * 100)}%`,
      cotizable: true,
      prestacional: true,
      taxable: true,
    });
  }
  if (nightSurcharge > 0) {
    extras.push({
      label: "Recargo nocturno",
      amount: nightSurcharge,
      detail: `${novelties.nightHours} h · recargo ${Math.round(p.nightSurcharge * 100)}%`,
      cotizable: true,
      prestacional: true,
      taxable: true,
    });
  }
  if (holiday > 0) {
    extras.push({
      label: "Dominical y festivo",
      amount: holiday,
      detail: `${novelties.holidayHours} h · recargo ${Math.round(p.sundayHolidaySurcharge * 100)}%`,
      cotizable: true,
      prestacional: true,
      taxable: true,
    });
  }
  if (bonus > 0) {
    extras.push({
      label: "Bonificación",
      amount: bonus,
      detail: "Gravable y cotizable",
      cotizable: true,
      prestacional: true,
      taxable: true,
    });
  }
  if (foodAllowance > 0) {
    extras.push({
      label: "Auxilio de alimentación",
      amount: foodAllowance,
      detail: "No constitutivo de salario",
      cotizable: false,
      prestacional: false,
      taxable: false,
    });
  }

  const total =
    extraDay + extraNight + nightSurcharge + holiday + bonus + foodAllowance;

  return {
    hourlyRate,
    extraDay,
    extraNight,
    nightSurcharge,
    holiday,
    bonus,
    foodAllowance,
    total,
    extras,
  };
};

export const payrollTotals = (lines: PayrollLine[]) => {
  const sum = (kind: PayrollLine["kind"]) =>
    lines
      .filter((line) => line.kind === kind)
      .reduce((total, line) => total + line.amount, 0);
  const gross = sum("earning");
  const deductions = sum("deduction");
  const employer = sum("employer");
  return {
    gross,
    deductions,
    employer,
    net: gross - deductions,
    totalCost: gross + employer,
  };
};

export const createPayrollLines = (
  employee: Employee,
  company: Company,
): PayrollLine[] =>
  calculatePayroll(employee, company, [
    { label: "Comisiones de ventas", amount: 0, cotizable: true },
  ]).lines.filter((line) => line.amount !== 0);
