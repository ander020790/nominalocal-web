import type { Company, Employee } from "@/data/types";
import { formatDateLong, fullName } from "@/lib/format";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";

export interface SuspensionDocument {
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  notes: string;
  status: string;
}

/** Acta de suspensión con fechas, días y explicación de los hechos. */
export const downloadSuspensionPdf = async (
  suspension: SuspensionDocument,
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
  const todayIso = new Date().toISOString().slice(0, 10);

  let y = drawLetterhead(doc, company, {
    title: "Acta de suspensión del contrato",
    subtitle: fullName(employee),
    consecutive,
    issuedAt: todayIso,
    extra: `Estado: ${suspension.status}`,
  });
  y += 4;

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  const intro = doc.splitTextToSize(
    `${company.name}, NIT ${company.nit}, representada legalmente por ${company.legalRep || "su representante legal"}, deja constancia de la suspensión del contrato de trabajo de ${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, quien desempeña el cargo de ${employee.position} en el área de ${employee.department}.`,
    maxWidth,
  ) as string[];
  doc.text(intro, margin, y);
  y += intro.length * 4.4 + 6;

  const rows: [string, string][] = [
    ["Colaborador", fullName(employee)],
    ["Documento", `${employee.docType} ${employee.docNumber}`],
    ["Cargo", employee.position],
    ["Contrato", employee.contractType.replace("-", " ")],
    ["Fecha de inicio", formatDateLong(suspension.startDate)],
    ["Fecha de fin", formatDateLong(suspension.endDate)],
    ["Días de suspensión", `${suspension.days} días`],
    ["Motivo", suspension.reason || "Falta disciplinaria"],
  ];

  doc.setFillColor(244, 243, 251);
  doc.roundedRect(margin, y, maxWidth, 40, 2, 2, "F");
  doc.setFontSize(8.3);
  rows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 4 + column * (maxWidth / 2);
    const lineY = y + 6 + row * 7;
    doc.setTextColor(110);
    doc.text(`${label}:`, x, lineY);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text(
      doc.splitTextToSize(value, maxWidth / 2 - 30)[0] ?? "",
      x + 29,
      lineY,
    );
    doc.setFont("helvetica", "normal");
  });
  y += 48;

  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Hechos y explicación de la suspensión", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  const explanation = doc.splitTextToSize(
    suspension.notes.trim() ||
      `Se suspende el contrato por ${suspension.reason || "incumplimiento de las obligaciones laborales"}, desde el ${formatDateLong(suspension.startDate)} hasta el ${formatDateLong(suspension.endDate)}, por un total de ${suspension.days} días.`,
    maxWidth,
  ) as string[];
  doc.text(explanation, margin, y);
  y += explanation.length * 4.2 + 7;

  doc.setFontSize(7.8);
  doc.setTextColor(105);
  const legal = doc.splitTextToSize(
    "Fundamento legal: artículos 112 y 113 del Código Sustantivo del Trabajo, que permiten suspender el contrato hasta por ocho (8) días por faltas que afecten la disciplina de la empresa, sin que ello implique terminación del vínculo. La suspensión no genera salario por los días no laborados y no afecta la causación de prestaciones sobre el tiempo efectivamente trabajado. El trabajador conserva su puesto y puede presentar sus descargos ante la empresa.",
    maxWidth,
  ) as string[];
  doc.text(legal, margin, y);

  const signatureY = pageHeight - 48;
  addSignatureImage(doc, company.signatureData, margin, signatureY - 14, 45, 12);
  doc.setDrawColor(60);
  doc.line(margin, signatureY, margin + 70, signatureY);
  doc.line(
    pageWidth - margin - 70,
    signatureY,
    pageWidth - margin,
    signatureY,
  );
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(company.legalRep || "Representante legal", margin, signatureY + 5);
  doc.text(fullName(employee), pageWidth - margin - 70, signatureY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Representante legal · ${company.name}`, margin, signatureY + 9);
  doc.text(
    `${employee.docType} ${employee.docNumber} · Notificado(a)`,
    pageWidth - margin - 70,
    signatureY + 9,
  );

  finishLetterhead(doc, company, consecutive);
  savePdfFile(
    doc,
    `acta-suspension-${employee.docNumber.replace(/\W+/g, "")}-${suspension.startDate}.pdf`,
  );
};
