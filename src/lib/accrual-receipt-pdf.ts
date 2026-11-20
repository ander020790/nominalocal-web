import type { AccrualPayment, Company, Employee } from "@/data/types";
import {
  ACCRUAL_LABELS,
  calculateAccrual,
} from "@/lib/accrual-template";
import {
  formatCOP,
  formatDateLong,
  fullName,
  numberToWords,
} from "@/lib/format";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";

/**
 * Comprobante de un pago parcial de prestaciones: muestra la liquidación
 * parcial a la fecha del pago y el saldo que queda pendiente.
 */
export const downloadAccrualReceiptPdf = async (
  payment: AccrualPayment,
  employee: Employee,
  company: Company,
  allPayments: AccrualPayment[],
  takenVacationDays: number,
  consecutive?: string,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;

  const prior = allPayments.filter(
    (item) =>
      item.employeeId === employee.id &&
      item.concept === payment.concept &&
      item.paidAt < payment.paidAt,
  );

  const accrual = calculateAccrual(
    employee,
    company,
    payment.concept,
    { cutoff: payment.paidAt, priorPayments: prior },
    takenVacationDays,
  );
  const balance = Math.max(0, accrual.net - payment.amount);

  let y = drawLetterhead(doc, company, {
    title: "Comprobante de pago parcial de prestaciones",
    subtitle: fullName(employee),
    consecutive,
    issuedAt: payment.paidAt,
    extra: `Concepto: ${ACCRUAL_LABELS[payment.concept]}`,
  });
  y += 4;

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  const intro = doc.splitTextToSize(
    `${company.name}, NIT ${company.nit}, y ${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, dejan constancia del pago parcial por concepto de ${ACCRUAL_LABELS[payment.concept].toLowerCase()} realizado el ${formatDateLong(payment.paidAt)}, con la liquidación proporcional a esa fecha.`,
    maxWidth,
  ) as string[];
  doc.text(intro, margin, y);
  y += intro.length * 4.4 + 6;

  const infoRows: [string, string][] = [
    ["Colaborador", fullName(employee)],
    ["Documento", `${employee.docType} ${employee.docNumber}`],
    ["Cargo", employee.position],
    ["Área", employee.department],
    ["Ingreso", formatDateLong(employee.startDate)],
    ["Forma de pago", "Abono en cuenta / nómina"],
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

  const rows: [string, string, boolean?][] = [
    ["Concepto", ACCRUAL_LABELS[payment.concept]],
    [
      "Días liquidados",
      `${payment.days > 0 ? payment.days.toLocaleString("es-CO", { maximumFractionDigits: 1 }) : accrual.days.toLocaleString("es-CO", { maximumFractionDigits: 1 })} días`,
    ],
    ["Valor causado a la fecha", formatCOP(accrual.value)],
    [
      accrual.concept === "vacaciones"
        ? "Vacaciones pagadas antes"
        : "Abonos anteriores del mismo concepto",
      formatCOP(accrual.priorTotal),
    ],
    ["Pagado en este comprobante", formatCOP(payment.amount), true],
    ["Saldo pendiente después del pago", formatCOP(balance)],
  ];

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, maxWidth, 7, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("LIQUIDACIÓN PARCIAL", margin + 2, y + 5);
  y += 11;

  doc.setFontSize(8.7);
  rows.forEach(([label, value, strong]) => {
    doc.setTextColor(110);
    doc.setFont("helvetica", "normal");
    doc.text(label, margin + 2, y);
    doc.setTextColor(30);
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.text(value, pageWidth - margin - 2, y, { align: "right" });
    y += 6;
  });

  if (payment.notes) {
    doc.setTextColor(110);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      doc.splitTextToSize(`Observaciones: ${payment.notes}`, maxWidth),
      margin + 2,
      y + 1,
    );
  }

  y += 8;
  doc.setDrawColor(210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, maxWidth, 13, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.6);
  doc.text("VALOR PAGADO", margin + 3, y + 8.5);
  doc.setFontSize(11.5);
  doc.text(formatCOP(payment.amount), pageWidth - margin - 3, y + 8.5, {
    align: "right",
  });
  y += 17;

  doc.setTextColor(30);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    `Son ${numberToWords(payment.amount)} pesos M/CTE.`,
    margin,
    y,
  );
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(105);
  const note = doc.splitTextToSize(
    accrual.concept === "vacaciones"
      ? "Este pago cubre las vacaciones causadas desde el último pago registrado hasta la fecha indicada. Las vacaciones se liquidan sobre el salario, sin auxilio de transporte, y el conteo de días vuelve a iniciar en esta fecha."
      : "Este comprobante corresponde a un pago parcial: no cierra la liquidación definitiva. Los valores se calculan sobre el salario y los días indicados, y el saldo se descontará en la liquidación final del contrato.",
    maxWidth,
  ) as string[];
  doc.text(note, margin, y);

  const signatureY = pageHeight - 46;
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
  doc.text(
    company.legalRep || "Representante legal",
    pageWidth - margin - half,
    signatureY + 5,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(
    (doc.splitTextToSize(
      `${employee.docType} ${employee.docNumber} · Recibí conforme`,
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
    `comprobante-${payment.concept}-${employee.docNumber.replace(/\W+/g, "")}-${payment.paidAt}.pdf`,
  );
};
