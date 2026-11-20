import type { Company } from "@/data/types";
import type { PayrollPaymentRow } from "@/lib/payroll-files";
import { payrollTotals } from "@/lib/payroll";
import {
  formatCOP,
  formatDateLong,
  formatMonth,
  fullName,
  numberToWords,
} from "@/lib/format";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";

export interface PayrollSettlementInfo {
  period: string;
  fortnight: 1 | 2;
  paymentDate: string;
}

/** Comprobante consolidado de la liquidación de una quincena. */
export const downloadPayrollSettlementPdf = async (
  rows: PayrollPaymentRow[],
  company: Company,
  info: PayrollSettlementInfo,
  consecutive?: string,
  draft = false,
) => {
  if (rows.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;

  const totals = rows.reduce(
    (acc, row) => {
      const result = payrollTotals(row.payroll.lines);
      return {
        gross: acc.gross + result.gross,
        deductions: acc.deductions + result.deductions,
        net: acc.net + result.net,
        cost: acc.cost + result.totalCost,
      };
    },
    { gross: 0, deductions: 0, net: 0, cost: 0 },
  );

  let y = drawLetterhead(doc, company, {
    title: draft
      ? "Plantilla de liquidación de nómina · BORRADOR"
      : "Comprobante de liquidación de nómina",
    subtitle: `${formatMonth(info.period)} · Quincena ${info.fortnight}`,
    consecutive,
    issuedAt: info.paymentDate,
    extra: `Fecha de liquidación: ${formatDateLong(info.paymentDate)}`,
  });
  y += 4;

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const intro = doc.splitTextToSize(
    `${company.name}, NIT ${company.nit}, certifica la liquidación de la nómina de la quincena ${info.fortnight} de ${formatMonth(info.period)}, con fecha de liquidación ${formatDateLong(info.paymentDate)}, para ${rows.length} ${rows.length === 1 ? "colaborador" : "colaboradores"}.`,
    maxWidth,
  ) as string[];
  doc.text(intro, margin, y);
  y += intro.length * 4.4 + 5;

  const columns = [
    { label: "Colaborador", width: 58 },
    { label: "Documento", width: 28 },
    { label: "Devengado", width: 28 },
    { label: "Deducciones", width: 28 },
    { label: "Neto", width: 32 },
  ];
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  const drawHeaderRow = () => {
    doc.setFillColor(30, 25, 70);
    doc.rect(margin, y, totalWidth, 7, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    let x = margin + 2;
    columns.forEach((column) => {
      doc.text(column.label, x, y + 4.8);
      x += column.width;
    });
    y += 10;
  };

  drawHeaderRow();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);

  const header = () =>
    drawLetterhead(doc, company, {
      title: draft
      ? "Plantilla de liquidación de nómina · BORRADOR"
      : "Comprobante de liquidación de nómina",
      subtitle: `${formatMonth(info.period)} · Quincena ${info.fortnight}`,
      consecutive,
      issuedAt: info.paymentDate,
      extra: `Fecha de liquidación: ${formatDateLong(info.paymentDate)}`,
    });

  rows.forEach(({ payroll, employee }) => {
    if (y > pageHeight - 42) {
      doc.addPage();
      y = header() + 4;
      drawHeaderRow();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
    }
    const result = payrollTotals(payroll.lines);
    const cells = [
      fullName(employee),
      `${employee.docType} ${employee.docNumber}`,
      formatCOP(result.gross),
      formatCOP(result.deductions),
      formatCOP(result.net),
    ];
    let x = margin + 2;
    doc.setTextColor(30);
    cells.forEach((cell, index) => {
      const column = columns[index];
      const lines = doc.splitTextToSize(String(cell), column.width - 3) as string[];
      doc.text(lines.slice(0, 2), x, y);
      x += column.width;
    });
    y += 7.2;
    doc.setDrawColor(228);
    doc.line(margin, y - 3, margin + totalWidth, y - 3);
  });

  if (y > pageHeight - 55) {
    doc.addPage();
    y = header() + 4;
  }

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, totalWidth, 9, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.text("TOTALES", margin + 2, y + 6);
  doc.text(formatCOP(totals.gross), margin + 2 + 58 + 28, y + 6);
  doc.text(formatCOP(totals.deductions), margin + 2 + 58 + 28 + 28, y + 6);
  doc.text(
    formatCOP(totals.net),
    margin + totalWidth - 2,
    y + 6,
    { align: "right" },
  );
  y += 14;

  doc.setTextColor(70);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(`Neto en letras: ${numberToWords(totals.net)} pesos M/CTE.`, margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(110);
  const note = doc.splitTextToSize(
    "Comprobante consolidado de la liquidación quincenal. Los valores corresponden a los recibos de nómina del periodo; el costo total incluye aportes patronales y provisiones proporcionales a los 15 días liquidados.",
    maxWidth,
  ) as string[];
  doc.text(note, margin, y);

  const signatureY = pageHeight - 46;
  doc.setDrawColor(60);
  doc.line(margin, signatureY, margin + 70, signatureY);
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  addSignatureImage(doc, company.signatureData, margin, signatureY - 16, 45, 13);
  doc.text(company.legalRep || "Representante legal", margin, signatureY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Representante legal · ${company.name}`, margin, signatureY + 9);
  doc.text(
    `Costo total empresa: ${formatCOP(totals.cost)}`,
    pageWidth - margin,
    signatureY + 5,
    { align: "right" },
  );

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, 
    `comprobante-nomina-${info.period}-q${info.fortnight}.pdf`,
  );
};
