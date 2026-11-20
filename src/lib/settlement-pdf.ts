import type { Company, Employee } from "@/data/types";
import { formatCOP, formatDateLong, fullName } from "@/lib/format";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";
import type { SettlementResult } from "@/lib/settlement";

export const downloadSettlementPdf = async (
  employee: Employee,
  company: Company,
  result: SettlementResult,
  otherDeductions: number,
  consecutive?: string,
): Promise<void> => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  const todayIso = new Date().toISOString().slice(0, 10);
  const today = formatDateLong(todayIso);

  let y = drawLetterhead(doc, company, {
    title: "Liquidación final de contrato",
    subtitle: fullName(employee),
    consecutive,
    issuedAt: todayIso,
  });
  y += 4;

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Colaborador: ${fullName(employee)} · ${employee.docType} ${employee.docNumber}`,
    margin,
    y,
  );
  y += 5;
  doc.text(
    `Cargo: ${employee.position} · Ingreso: ${formatDateLong(employee.startDate)} · Retiro: ${formatDateLong(employee.endDate ?? todayIso)}`,
    margin,
    y,
  );
  y += 10;

  doc.setFillColor(242, 241, 250);
  doc.rect(margin, y, maxWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("CONCEPTO", margin + 2, y + 5);
  doc.text("DETALLE", margin + 80, y + 5);
  doc.text("VALOR", pageWidth - margin - 2, y + 5, { align: "right" });
  y += 11;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  result.lines.forEach((line) => {
    doc.text(line.label, margin + 2, y);
    doc.setTextColor(110);
    doc.setFontSize(8);
    doc.text(line.detail, margin + 80, y);
    doc.setTextColor(30);
    doc.setFontSize(9);
    doc.text(formatCOP(line.amount), pageWidth - margin - 2, y, {
      align: "right",
    });
    y += 6.5;
  });

  doc.setDrawColor(210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Total devengado", margin + 2, y);
  doc.text(formatCOP(result.gross), pageWidth - margin - 2, y, {
    align: "right",
  });
  y += 6;
  doc.text("Deducciones de ley", margin + 2, y);
  doc.text(`- ${formatCOP(result.legalDeductions)}`, pageWidth - margin - 2, y, {
    align: "right",
  });
  y += 6;
  if (otherDeductions > 0) {
    doc.text("Otras deducciones", margin + 2, y);
    doc.text(`- ${formatCOP(otherDeductions)}`, pageWidth - margin - 2, y, {
      align: "right",
    });
    y += 6;
  }

  result.priorPayments.forEach((payment) => {
    doc.text(payment.label, margin + 2, y);
    doc.text(`- ${formatCOP(payment.amount)}`, pageWidth - margin - 2, y, {
      align: "right",
    });
    y += 6;
  });

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, maxWidth, 12, "F");
  doc.setTextColor(255);
  doc.setFontSize(10.5);
  doc.text("NETO A PAGAR", margin + 3, y + 8);
  doc.setFontSize(12);
  doc.text(formatCOP(result.net), pageWidth - margin - 3, y + 8, {
    align: "right",
  });
  y += 20;
  doc.setTextColor(30);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  const legalNote = doc.splitTextToSize(
    "Liquidación calculada con base en los artículos 249, 253, 306 y 186 del Código Sustantivo del Trabajo: cesantías y prima incluyen el auxilio de transporte; vacaciones = salario ÷ 30 × días hábiles acumulados (15 hábiles por año); intereses = cesantías × 12% × días ÷ 360. Año laboral de 360 días (12 meses de 30). Las vacaciones ya pagadas reinician el conteo de días y no se descuentan de nuevo. Salud y pensión se descuentan del salario pendiente y de las vacaciones compensadas. Los valores son una estimación de gestión interna y no sustituyen la revisión de un contador o abogado laboral.",
    maxWidth,
  ) as string[];
  doc.text(legalNote, margin, y);
  y += legalNote.length * 3.8 + 10;

  // Firma del representante legal de la empresa.
  addSignatureImage(doc, company.signatureData, margin, y - 8, 45, 14);
  doc.setDrawColor(60);
  doc.line(margin, y + 6, margin + 60, y + 6);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(company.legalRep || "Representante legal", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Representante legal · ${company.name}`, margin, y + 4);

  doc.text(
    "Recibí conforme: ______________________________",
    pageWidth / 2 + 5,
    pageHeight - 38,
  );
  addSignatureImage(
    doc,
    employee.signatureData,
    pageWidth / 2 + 5,
    pageHeight - 52,
    45,
    13,
  );
  doc.text(fullName(employee), pageWidth / 2 + 5, pageHeight - 33);
  doc.text(
    `${employee.docType} ${employee.docNumber}`,
    pageWidth / 2 + 5,
    pageHeight - 29,
  );

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, 
    `liquidacion-final-${employee.docNumber.replace(/\W+/g, "")}.pdf`,
  );
};

export interface GeneralSettlementRow {
  employee: Employee;
  result: SettlementResult;
}

export const downloadGeneralSettlementPdf = async (
  rows: GeneralSettlementRow[],
  company: Company,
  consecutive?: string,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const today = formatDateLong(new Date().toISOString().slice(0, 10));

  const header = () =>
    drawLetterhead(doc, company, {
      title: "Liquidación general de contratos",
      subtitle: `${rows.length} colaboradores`,
      consecutive,
      issuedAt: new Date().toISOString().slice(0, 10),
    });

  let y = header() + 2;
  const columns = [
    { label: "Empleado", width: 46 },
    { label: "Documento", width: 26 },
    { label: "Retiro", width: 20 },
    { label: "Vacaciones", width: 26 },
    { label: "Cesantías", width: 26 },
    { label: "Intereses", width: 24 },
    { label: "Prima", width: 24 },
    { label: "Total", width: 27 },
    { label: "Deducciones", width: 25 },
    { label: "Neto", width: 27 },
  ];
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  const drawHeaderRow = () => {
    doc.setFillColor(242, 241, 250);
    doc.rect(margin, y, totalWidth, 7, "F");
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    let x = margin + 2;
    columns.forEach((column) => {
      doc.text(column.label, x, y + 4.8);
      x += column.width;
    });
    y += 10;
  };

  drawHeaderRow();

  let totals = { vacation: 0, cesantias: 0, intereses: 0, prima: 0, gross: 0, deductions: 0, net: 0 };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  rows.forEach(({ employee, result }) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = header() + 2;
      drawHeaderRow();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
    }
    const vacation = result.lines.find((line) => line.label === "Vacaciones pendientes")?.amount ?? 0;
    const cesantias = result.lines.find((line) => line.label === "Cesantías")?.amount ?? 0;
    const intereses = result.lines.find((line) => line.label === "Intereses sobre cesantías")?.amount ?? 0;
    const prima = result.lines.find((line) => line.label === "Prima de servicios")?.amount ?? 0;

    totals = {
      vacation: totals.vacation + vacation,
      cesantias: totals.cesantias + cesantias,
      intereses: totals.intereses + intereses,
      prima: totals.prima + prima,
      gross: totals.gross + result.gross,
      deductions: totals.deductions + result.totalDeductions,
      net: totals.net + result.net,
    };

    const cells = [
      `${employee.firstName} ${employee.lastName}`,
      `${employee.docType} ${employee.docNumber}`,
      employee.endDate ? formatDateLong(employee.endDate) : "—",
      formatCOP(vacation),
      formatCOP(cesantias),
      formatCOP(intereses),
      formatCOP(prima),
      formatCOP(result.gross),
      formatCOP(result.totalDeductions),
      formatCOP(result.net),
    ];

    let x = margin + 2;
    cells.forEach((cell, index) => {
      const column = columns[index];
      const text = String(cell);
      const lines = doc.splitTextToSize(text, column.width - 3) as string[];
      doc.text(lines.slice(0, 2), x, y);
      x += column.width;
    });
    y += 8.4;
    doc.setDrawColor(230);
    doc.line(margin, y - 2.5, margin + totalWidth, y - 2.5);
  });

  if (y > pageHeight - 42) {
    doc.addPage();
    y = header() + 2;
  }

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, totalWidth, 9, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TOTALES", margin + 2, y + 6);
  let x = margin + 2 + columns[0].width + columns[1].width + columns[2].width;
  doc.text(formatCOP(totals.vacation), x, y + 6);
  x += columns[3].width;
  doc.text(formatCOP(totals.cesantias), x, y + 6);
  x += columns[4].width;
  doc.text(formatCOP(totals.intereses), x, y + 6);
  x += columns[5].width;
  doc.text(formatCOP(totals.prima), x, y + 6);
  x += columns[6].width;
  doc.text(formatCOP(totals.gross), x, y + 6);
  x += columns[7].width;
  doc.text(formatCOP(totals.deductions), x, y + 6);
  x += columns[8].width;
  doc.text(formatCOP(totals.net), x, y + 6);

  y += 15;
  doc.setTextColor(100);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  const note = doc.splitTextToSize(
    "Liquidación general calculada con base en los artículos 249, 253, 306 y 186 del C.S.T. Cesantías y prima incluyen el auxilio de transporte; las vacaciones se calculan a 15 días hábiles por año. Se descuentan los pagos parciales registrados. Estimación de gestión interna; no sustituye la revisión de un contador o abogado laboral.",
    totalWidth,
  ) as string[];
  doc.text(note, margin, y);
  y += note.length * 4 + 8;

  if (y < pageHeight - 25) {
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(company.legalRep || "Representante legal", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Representante legal · ${company.name}`, margin, y + 4);
  }

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, `liquidacion-general-${today.replace(/\s+/g, "-")}.pdf`);
};
