import type { Company, Employee, Payroll } from "@/data/types";
import { payrollTotals } from "@/lib/payroll";

export interface PayrollPaymentRow {
  payroll: Payroll;
  employee: Employee;
}

const stripAccents = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const padNumber = (value: string, length: number) => {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-length).padStart(length, "0");
};

const padAlpha = (value: string, length: number) =>
  stripAccents(value).replace(/\s+/g, " ").trim().slice(0, length).padEnd(length, " ");

const amountField = (value: number) =>
  Math.round(value * 100)
    .toString()
    .padStart(17, "0")
    .slice(-17);

const documentType = (employee: Employee) => {
  if (employee.docType === "CE") return "2";
  if (employee.docType === "Pasaporte") return "5";
  return "1";
};

const bankCode = (bank: string) => {
  const normalized = stripAccents(bank).toLowerCase();
  if (normalized.includes("bancolombia")) return "000000007";
  return "";
};

const dateField = (date: Date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

export interface PabFileResult {
  content: string;
  included: number;
  skipped: { employee: Employee; reason: string }[];
  total: number;
}

/** Genera el archivo plano PAB de Bancolombia para pago de nómina. */
export const buildBancolombiaPab = (
  rows: PayrollPaymentRow[],
  company: Company,
  paymentDate = new Date(),
): PabFileResult => {
  const companyAccount = String(company.payrollAccountNumber ?? "").replace(
    /\D/g,
    "",
  );
  if (!companyAccount) {
    throw new Error(
      "Configura la cuenta para pagar la nómina en Ajustes → Empresa.",
    );
  }
  const nit = padNumber(company.nit, 15);
  const date = dateField(paymentDate);
  const skipped: PabFileResult["skipped"] = [];
  const details: string[] = [];
  let total = 0;

  rows.forEach(({ payroll, employee }) => {
    const bank = bankCode(employee.bank);
    const account = String(employee.accountNumber ?? "").replace(/\D/g, "");
    if (!bank) {
      skipped.push({
        employee,
        reason: "La cuenta no es de Bancolombia (el archivo PAB es para ese banco).",
      });
      return;
    }
    if (!account) {
      skipped.push({ employee, reason: "No tiene número de cuenta registrado." });
      return;
    }

    const net = payrollTotals(payroll.lines).net;
    total += net;
    const transactionType = employee.accountType === "corriente" ? "27" : "37";
    const reference = padAlpha(`NOMINA ${payroll.period}`, 21);
    const phone = String(employee.phone ?? "").replace(/\D/g, "").slice(0, 10);

    details.push(
      "6" +
        padNumber(employee.docNumber, 15) +
        padAlpha(
          `${employee.firstName} ${employee.lastName}`,
          30,
        ) +
        bank +
        padAlpha(account, 17) +
        " " +
        transactionType +
        amountField(net) +
        date +
        reference +
        documentType(employee) +
        "00000" +
        padAlpha(phone, 15) +
        " ".repeat(80) +
        " ".repeat(15) +
        " ".repeat(27),
    );
  });

  if (details.length === 0) {
    throw new Error(
      "No hay empleados con cuenta Bancolombia para incluir en el archivo.",
    );
  }

  const header =
    "1" +
    nit +
    " " +
    " ".repeat(15) +
    "225" +
    padAlpha("NOMINA", 10) +
    date +
    "A1" +
    date +
    String(details.length).padStart(6, "0") +
    "0".repeat(17) +
    amountField(total) +
    padNumber(companyAccount, 11) +
    (company.payrollAccountType === "D" ? "D" : "S") +
    " ".repeat(149);

  return {
    content: `${[header, ...details].join("\r\n")}\r\n`,
    included: details.length,
    skipped,
    total,
  };
};

export const downloadBancolombiaPab = async (
  rows: PayrollPaymentRow[],
  company: Company,
  period: string,
  paymentDate?: Date,
) => {
  const result = buildBancolombiaPab(rows, company, paymentDate);
  const blob = new Blob([result.content], {
    type: "text/plain;charset=iso-8859-1",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nomina-${period}-pab-bancolombia.txt`;
  link.click();
  URL.revokeObjectURL(url);
  return result;
};

export const downloadPayrollExcel = async (
  rows: PayrollPaymentRow[],
  company: Company,
  period: string,
) => {
  const XLSX = await import("xlsx");
  const data = rows.map(({ payroll, employee }) => {
    const totals = payrollTotals(payroll.lines);
    return {
      Periodo: period,
      "Fecha liquidación": payroll.paymentDate ?? `${period}-15`,
      Empresa: company.name,
      "NIT empresa": company.nit,
      Documento: `${employee.docType} ${employee.docNumber}`,
      Empleado: `${employee.firstName} ${employee.lastName}`,
      Cargo: employee.position,
      "Punto de venta":
        company.pointsOfSale.find((pos) => pos.id === employee.pointOfSaleId)
          ?.name ?? "",
      Banco: employee.bank,
      "Tipo cuenta":
        employee.accountType === "corriente" ? "Corriente" : "Ahorros",
      Cuenta: employee.accountNumber,
      Devengado: totals.gross,
      Deducciones: totals.deductions,
      Neto: totals.net,
      "Coste empresa": totals.totalCost,
      Estado: payroll.status,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 16 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 30 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  const detailRows = rows.flatMap(({ payroll, employee }) =>
    payroll.lines.map((line) => ({
      Periodo: period,
      "Fecha liquidación": payroll.paymentDate ?? `${period}-15`,
      Empleado: `${employee.firstName} ${employee.lastName}`.trim(),
      Documento: `${employee.docType} ${employee.docNumber}`,
      Cargo: employee.position,
      Tipo:
        line.kind === "earning"
          ? "Devengo"
          : line.kind === "deduction"
            ? "Deducción"
            : line.group === "provisiones"
              ? "Prestación social"
              : "Aporte patronal",
      Grupo: line.group ?? "",
      Concepto: line.label,
      Detalle: line.detail ?? "",
      Valor: line.amount,
    })),
  );
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet["!cols"] = [
    { wch: 10 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 30 },
    { wch: 34 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  const totalsRows = rows.map(({ payroll, employee }) => {
    const sum = (predicate: (line: { kind: string; group?: string | null }) => boolean) =>
      payroll.lines.filter(predicate).reduce((total, line) => total + line.amount, 0);
    const gross = sum((line) => line.kind === "earning");
    const deductions = sum((line) => line.kind === "deduction");
    const contributions = sum(
      (line) => line.kind === "employer" && line.group === "aportes",
    );
    const provisions = sum(
      (line) => line.kind === "employer" && line.group === "provisiones",
    );
    return {
      Periodo: period,
      Empleado: `${employee.firstName} ${employee.lastName}`.trim(),
      Documento: `${employee.docType} ${employee.docNumber}`,
      Devengado: gross,
      Deducciones: deductions,
      "Neto pagado": gross - deductions,
      "Aportes patronales": contributions,
      "Prestaciones sociales": provisions,
      "Costo total": gross + contributions + provisions,
    };
  });
  const totalsSheet = XLSX.utils.json_to_sheet(totalsRows);
  totalsSheet["!cols"] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle conceptos");
  XLSX.utils.book_append_sheet(workbook, totalsSheet, "Totales por empleado");
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen");
  XLSX.writeFile(
    workbook,
    `nomina-${period}-${stripAccents(company.name).replace(/[^\w]+/g, "-")}.xlsx`,
  );
};
