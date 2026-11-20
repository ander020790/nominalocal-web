import type { Company, Employee, EmployeeLoan } from "@/data/types";
import { formatCOP, formatDateLong, formatMonth, fullName } from "@/lib/format";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";

export const loanQuota = (loan: EmployeeLoan) =>
  Math.max(1, Math.round(loan.amount / Math.max(1, loan.installments)));

const statusLabel: Record<EmployeeLoan["status"], string> = {
  solicitado: "Solicitado por el colaborador",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  pagado: "Pagado",
};

export const downloadLoanPdf = async (
  loan: EmployeeLoan,
  employee: Employee,
  company: Company,
  consecutive?: string,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  const quota = loanQuota(loan);
  const total = quota * loan.installments;
  const todayIso = new Date().toISOString().slice(0, 10);

  let y = drawLetterhead(doc, company, {
    title: "Solicitud de préstamo y autorización de descuento",
    subtitle: fullName(employee),
    consecutive,
    issuedAt: todayIso,
    extra: `Estado: ${statusLabel[loan.status]}`,
  });
  y += 3;

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.4);
  const intro = doc.splitTextToSize(
    `Yo, ${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, trabajador(a) de ${company.name} con NIT ${company.nit}, solicito el siguiente préstamo y autorizo de manera expresa el descuento de su valor en mi salario, en los términos aquí señalados.`,
    maxWidth,
  ) as string[];
  doc.text(intro, margin, y);
  y += intro.length * 4.4 + 6;

  const infoRows: [string, string][] = [
    ["Colaborador", fullName(employee)],
    ["Documento", `${employee.docType} ${employee.docNumber}`],
    ["Cargo", employee.position],
    ["Área", employee.department],
    ["Salario base", formatCOP(employee.salary)],
    ["Ingreso", formatDateLong(employee.startDate)],
  ];
  doc.setFillColor(244, 243, 251);
  doc.roundedRect(margin, y, maxWidth, 26, 2, 2, "F");
  doc.setFontSize(8.2);
  infoRows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 4 + column * (maxWidth / 2);
    const lineY = y + 6 + row * 6.6;
    doc.setTextColor(110);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, x, lineY);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text(
      doc.splitTextToSize(value, maxWidth / 2 - 26)[0] ?? "",
      x + 25,
      lineY,
    );
  });
  y += 34;

  const rows: [string, string][] = [
    ["Monto solicitado", formatCOP(loan.amount)],
    ["Número de cuotas", `${loan.installments} ${loan.installments === 1 ? "cuota" : "cuotas"}`],
    ["Valor de la cuota mensual", formatCOP(quota)],
    [
      "Periodo de descuento inicial",
      loan.startPeriod ? formatMonth(loan.startPeriod) : "Siguiente nómina",
    ],
    ["Total a descontar", formatCOP(total)],
    ["Estado de la solicitud", statusLabel[loan.status]],
  ];

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, maxWidth, 7, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("CONDICIONES DEL PRÉSTAMO", margin + 2, y + 5);
  y += 11;

  doc.setFontSize(8.6);
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      doc.setFillColor(index % 4 === 0 ? 250 : 255, 250, 252);
    }
    doc.setTextColor(110);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin + 2, y);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageWidth - margin - 2, y, { align: "right" });
    y += 5.6;
  });

  y += 2;
  doc.setDrawColor(210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.text("Motivo de la solicitud", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  const reason = doc.splitTextToSize(
    loan.reason.trim() || "Solicitud voluntaria del colaborador.",
    maxWidth,
  ) as string[];
  doc.text(reason, margin, y);
  y += reason.length * 4.2 + 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.text("Autorización de descuento", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const clauses = [
    `1. Autorizo a ${company.name} para descontar de mi salario la suma de ${formatCOP(quota)} mensuales, hasta completar el total de ${formatCOP(total)}, a partir de ${loan.startPeriod ? formatMonth(loan.startPeriod) : "la nómina siguiente a la aprobación"}.`,
    "2. El descuento se aplicará en la nómina mensual y quedará registrado en mi comprobante de pago. Autorizo los descuentos de que trata el artículo 149 del Código Sustantivo del Trabajo.",
    "3. Entiendo que los descuentos por este concepto, sumados a los demás autorizados, no pueden superar el 50% del salario neto que recibo en cada periodo.",
    "4. Si mi contrato termina antes de pagar la totalidad del préstamo, autorizo descontar el saldo pendiente de mi liquidación final y de las prestaciones sociales a las que tenga derecho, hasta donde la ley lo permita.",
    "5. Puedo solicitar por escrito la modificación del plazo o el pago anticipado del saldo en cualquier momento, previa aceptación de la empresa.",
  ];
  clauses.forEach((clause) => {
    const lines = doc.splitTextToSize(clause, maxWidth) as string[];
    lines.forEach((line) => {
      doc.text(line, margin, y);
      y += 4;
    });
    y += 2;
  });

  y += 3;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.4);
  doc.setTextColor(105);
  const note = doc.splitTextToSize(
    "Documento de gestión interna de la empresa. Se firma por duplicado: un ejemplar para el trabajador y otro para el empleador. No sustituye la revisión de un contador o abogado laboral.",
    maxWidth,
  ) as string[];
  doc.text(note, margin, y);

  const signatureY = pageHeight - 48;
  const half = maxWidth / 2 - 6;
  addSignatureImage(
    doc,
    company.signatureData,
    pageWidth - margin - half,
    signatureY - 14,
    half - 4,
    12,
  );
  addSignatureImage(
    doc,
    employee.signatureData,
    margin,
    signatureY - 14,
    half - 4,
    12,
  );
  doc.setDrawColor(60);
  doc.line(margin, signatureY, margin + half, signatureY);
  doc.line(
    pageWidth - margin - half,
    signatureY,
    pageWidth - margin,
    signatureY,
  );
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(fullName(employee), margin, signatureY + 5);
  doc.text(company.legalRep || "Representante legal", pageWidth - margin - half, signatureY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(
    (doc.splitTextToSize(
      `${employee.docType} ${employee.docNumber} · Trabajador(a) que solicita y autoriza`,
      half - 3,
    ) as string[]).slice(0, 2),
    margin,
    signatureY + 9.5,
  );
  doc.text(
    (doc.splitTextToSize(
      `Representante legal · ${company.name}`,
      half - 3,
    ) as string[]).slice(0, 2),
    pageWidth - margin - half,
    signatureY + 9.5,
  );

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, 
    `prestamo-${employee.docNumber.replace(/\W+/g, "")}-${loan.id.slice(0, 6)}.pdf`,
  );
};
