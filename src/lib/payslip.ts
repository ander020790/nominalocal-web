import type { Company, Employee, Payroll } from "@/data/types";
import { formatCOP, formatDate, formatMonth, fullName } from "@/lib/format";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";
import { payrollTotals } from "@/lib/payroll";

export const downloadPayslipPdf = async (
  payroll: Payroll,
  employee: Employee,
  company: Company,
  consecutive?: string,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  const totals = payrollTotals(payroll.lines);

  const pageHeight = doc.internal.pageSize.getHeight();

  let y = drawLetterhead(doc, company, {
    title: "Comprobante de pago de nómina",
    subtitle: `${fullName(employee)} · ${employee.position}`,
    consecutive,
    issuedAt: payroll.createdAt.slice(0, 10),
    extra: `Periodo ${formatMonth(payroll.period)} · Quincena ${payroll.fortnight} · Liquidación ${formatDate(payroll.paymentDate ?? payroll.createdAt)}`,
  });
  y += 4;
  if (payroll.status === "borrador") {
    doc.setTextColor(180, 83, 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("BORRADOR · pendiente de revisión", margin, y);
    y += 5;
  }
  doc.setTextColor(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DATOS DEL COLABORADOR", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const left = [
    `Nombre: ${fullName(employee)}`,
    `Documento: ${employee.docType} ${employee.docNumber}`,
    `Cargo: ${employee.position}`,
    `Área: ${employee.department}`,
  ];
  const right = [
    `Contrato: ${employee.contractType.replace("-", " ")}`,
    `Ingreso: ${formatDate(employee.startDate)}`,
    `EPS: ${employee.eps || "Sin registrar"}`,
    `Pensión: ${employee.pensionFund || "Sin registrar"}`,
  ];
  left.forEach((line, index) => {
    doc.text(line, margin, y + index * 5);
    doc.text(right[index], pageWidth / 2 + 4, y + index * 5);
  });
  y += left.length * 5 + 3;
  doc.text(
    `ARL: ${employee.arlProvider || "Sin registrar"} (nivel ${employee.riskLevel}) · Caja de compensación: ${employee.compensationFund || "Sin registrar"}`,
    margin,
    y,
  );
  y += 9;

  const earnings = payroll.lines.filter((line) => line.kind === "earning");
  const deductions = payroll.lines.filter((line) => line.kind === "deduction");
  const deductionLabel = (label: string) => {
    if (label.startsWith("Salud")) {
      return `${label} · ${employee.eps || "Sin registrar"}`;
    }
    if (label.startsWith("Pensión")) {
      return `${label} · ${employee.pensionFund || "Sin registrar"}`;
    }
    return label;
  };

  const columnWidth = (maxWidth - 6) / 2;
  const drawRow = (
    label: string,
    amount: string,
    x: number,
    yy: number,
    bold = false,
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(label, columnWidth - 30) as string[];
    doc.text(lines, x, yy);
    doc.text(amount, x + columnWidth, yy, { align: "right" });
    return lines.length;
  };

  doc.setFillColor(242, 241, 250);
  doc.rect(margin, y, maxWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DEVENGOS", margin + 3, y + 5.5);
  doc.text("DEDUCCIONES", pageWidth / 2 + 4, y + 5.5);
  y += 13;

  doc.setFontSize(8.5);
  const rowCount = Math.max(earnings.length, deductions.length);
  for (let index = 0; index < rowCount; index += 1) {
    const earning = earnings[index];
    const deduction = deductions[index];
    const height = Math.max(
      earning ? drawRow(earning.label, formatCOP(earning.amount), margin + 3, y) : 1,
      deduction
        ? drawRow(
            deduction.label,
            formatCOP(deduction.amount),
            pageWidth / 2 + 4,
            y,
          )
        : 1,
    );
    y += Math.max(6, height * 4.5);
  }

  y += 2;
  doc.setDrawColor(215);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  drawRow("Total devengado", formatCOP(totals.gross), margin + 3, y, true);
  drawRow(
    "Total deducciones",
    formatCOP(totals.deductions),
    pageWidth / 2 + 4,
    y,
    true,
  );
  y += 10;

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, maxWidth, 12, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("NETO A PAGAR", margin + 4, y + 8);
  doc.setFontSize(12);
  doc.text(formatCOP(totals.net), pageWidth - margin - 4, y + 8, {
    align: "right",
  });
  doc.setTextColor(35);
  y += 22;

  // El comprobante del colaborador no muestra aportes ni provisiones de la
  // empresa: esa información es interna de la compañía.
  y += 6;
  const novelties = (payroll.novelties ?? {}) as Record<string, number>;
  const suspensionDays = Number(novelties.suspensionDays ?? 0);
  const unpaidDays = Number(novelties.unpaidDays ?? 0);
  const incapacityDays = Number(novelties.incapacityDays ?? 0);
  const vacationDays = Number(novelties.vacationDays ?? 0);
  const foodAllowance = Number(novelties.foodAllowance ?? 0);
  const extraInfo = novelties as unknown as Record<string, string | number>;
  const suspensionRange = String(extraInfo.suspensionRange ?? "");
  const unpaidRange = String(extraInfo.unpaidRange ?? "");
  const incapacityRange = String(extraInfo.incapacityRange ?? "");
  const vacationRange = String(extraInfo.vacationRange ?? "");
  const dailySalary = employee.salary / 30;
  const missingDays = Math.max(0, 15 - Number(payroll.daysWorked ?? 15));
  const hasBreakdown =
    suspensionDays > 0 ||
    unpaidDays > 0 ||
    incapacityDays > 0 ||
    vacationDays > 0;

  const detailRows: { label: string; formula: string; amount: number }[] = [];
  if (suspensionDays > 0) {
    detailRows.push({
      label: `Suspensión${suspensionRange ? ` del ${suspensionRange}` : ""} · ${suspensionDays} días`,
      formula: `${formatCOP(employee.salary)} ÷ 30 × ${suspensionDays} días`,
      amount: -Math.round(dailySalary * suspensionDays),
    });
  }
  if (unpaidDays > 0) {
    detailRows.push({
      label: `Ausencia no remunerada${unpaidRange ? ` del ${unpaidRange}` : ""} · ${unpaidDays} días`,
      formula: `${formatCOP(employee.salary)} ÷ 30 × ${unpaidDays} días`,
      amount: -Math.round(dailySalary * unpaidDays),
    });
  }
  if (vacationDays > 0) {
    detailRows.push({
      label: `Vacaciones${vacationRange ? ` del ${vacationRange}` : ""} · ${vacationDays} días`,
      formula: `${formatCOP(employee.salary)} ÷ 30 × ${vacationDays} días · se paga en la liquidación de vacaciones`,
      amount: -Math.round(dailySalary * vacationDays),
    });
  }
  if (incapacityDays > 0) {
    detailRows.push({
      label: `Incapacidad${incapacityRange ? ` del ${incapacityRange}` : ""} · ${incapacityDays} días · 100%`,
      formula: `(${formatCOP(employee.salary)} + ${formatCOP(foodAllowance)}) ÷ 30 × ${incapacityDays} días`,
      amount: Math.round(((employee.salary + foodAllowance) / 30) * incapacityDays),
    });
  }
  if (!hasBreakdown && missingDays > 0) {
    detailRows.push({
      // No generar una novedad de descuento por los días
// anteriores a la fecha de ingreso del trabajador.
// El salario proporcional ya está reflejado en los devengos.
    });
  }

  if (detailRows.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30);
    doc.text("LIQUIDACIÓN DETALLADA DE NOVEDADES", margin, y);
    y += 4.5;
    doc.setFontSize(7.4);
    doc.setTextColor(110);
    doc.text("CONCEPTO", margin, y);
    doc.text("CÁLCULO", margin + 78, y);
    doc.text("VALOR", pageWidth - margin, y, { align: "right" });
    y += 1.6;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    detailRows.forEach((row) => {
      doc.setTextColor(30);
      doc.text(doc.splitTextToSize(row.label, 74)[0] ?? "", margin, y);
      doc.setTextColor(110);
      doc.setFontSize(7.2);
      doc.text(
        doc.splitTextToSize(row.formula, 78)[0] ?? "",
        margin + 78,
        y,
      );
      doc.setFontSize(7.6);
      doc.setTextColor(row.amount < 0 ? 150 : 30);
      doc.text(formatCOP(row.amount), pageWidth - margin, y, {
        align: "right",
      });
      y += 5;
    });

    doc.setDrawColor(200);
    doc.line(margin, y - 1.6, pageWidth - margin, y - 1.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30);
    doc.text(
      `Total novedades: ${formatCOP(detailRows.reduce((sum, row) => sum + row.amount, 0))}`,
      pageWidth - margin,
      y + 2.5,
      { align: "right" },
    );
    y += 9;
  }

  const signY = pageHeight - 46;
  const half = maxWidth / 2 - 8;
  addSignatureImage(doc, company.signatureData, margin, signY - 14, 45, 12);
  doc.setDrawColor(60);
  doc.line(margin, signY, margin + half, signY);
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.text(company.legalRep || "Representante legal", margin, signY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(
    `Representante legal · ${company.name}`,
    margin,
    signY + 9,
  );
  doc.text(`NIT ${company.nit}`, margin, signY + 12.5);

  addSignatureImage(
    doc,
    employee.signatureData,
    pageWidth - margin - half,
    signY - 14,
    half - 4,
    12,
  );
  doc.line(
    pageWidth - margin - half,
    signY,
    pageWidth - margin,
    signY,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.text(fullName(employee), pageWidth - margin - half, signY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(
    `${employee.docType} ${employee.docNumber} · Recibí conforme`,
    pageWidth - margin - half,
    signY + 9,
  );
  doc.text(
    formatDate(payroll.paymentDate ?? payroll.createdAt),
    pageWidth - margin - half,
    signY + 12.5,
  );

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, 
    `nomina-${employee.docNumber}-${payroll.period}.pdf`.replace(/\s+/g, "-"),
  );
};
