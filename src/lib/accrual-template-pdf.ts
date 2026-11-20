import type { Company, Employee } from "@/data/types";
import {
  ACCRUAL_LABELS,
  ACCRUAL_LEGAL,
  type AccrualTemplate,
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

const formatDays = (value: number) =>
  value.toLocaleString("es-CO", { maximumFractionDigits: 1 });

const contractLabel = (value: string) =>
  value === "prestacion-servicios"
    ? "Prestación de servicios"
    : value === "obra-labor"
      ? "Obra o labor"
      : value === "fijo"
        ? "Término fijo"
        : "Indefinido";

export const downloadAccrualTemplatePdf = async (
  employee: Employee,
  company: Company,
  accrual: AccrualTemplate,
  consecutive?: string,
): Promise<void> => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  const todayIso = new Date().toISOString().slice(0, 10);

  let y = drawLetterhead(doc, company, {
    title: accrual.title.replace("PLANTILLA DE PAGO DE ", "Plantilla de pago de "),
    subtitle: fullName(employee),
    consecutive: consecutive ?? accrual.reference,
    issuedAt: todayIso,
    extra: `Periodo liquidado: ${accrual.periodLabel}`,
  });
  y += 4;
  doc.setTextColor(30);

  doc.setTextColor(30);
  doc.setFontSize(8.8);
  const intro = doc.splitTextToSize(
    `La empresa ${company.name}, identificada con NIT ${company.nit}, y ${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, dejan constancia del siguiente pago por concepto de ${accrual.title.replace("PLANTILLA DE PAGO DE ", "").toLowerCase()}, liquidado con corte al ${formatDateLong(accrual.cutoff)}.`,
    maxWidth,
  ) as string[];
  doc.text(intro, margin, y);
  y += intro.length * 4.4 + 5;

  const infoRows: [string, string][] = [
    ["Colaborador", fullName(employee)],
    ["Documento", `${employee.docType} ${employee.docNumber}`],
    ["Cargo", employee.position],
    ["Área / sede", `${employee.department}${employee.city ? ` · ${employee.city}` : ""}`],
    ["Tipo de contrato", contractLabel(employee.contractType)],
    ["Fecha de ingreso", formatDateLong(employee.startDate)],
    ["Fecha de corte", formatDateLong(accrual.cutoff)],
    ["Salario base", formatCOP(accrual.salaryBase)],
  ];

  doc.setFillColor(244, 243, 251);
  doc.roundedRect(margin, y, maxWidth, 32, 2, 2, "F");
  doc.setFontSize(8.4);
  infoRows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 4 + column * (maxWidth / 2);
    const lineY = y + 6 + row * 7;
    doc.setTextColor(110);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, x, lineY);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text(
      doc.splitTextToSize(value, maxWidth / 2 - 26)[0] ?? "",
      x + 27,
      lineY,
    );
  });
  y += 40;

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, maxWidth, 7, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("CONCEPTO", margin + 2, y + 5);
  doc.text("CÁLCULO", margin + 92, y + 5);
  doc.text("VALOR", pageWidth - margin - 2, y + 5, { align: "right" });
  y += 11;

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.text(ACCRUAL_LABELS[accrual.concept].toUpperCase(), margin + 2, y);
  doc.setTextColor(110);
  doc.setFontSize(7.6);
  doc.text(
    `${formatDays(accrual.days)} días${accrual.concept === "vacaciones" ? " hábiles" : ` · base ${formatCOP(accrual.baseForDisplay)}`}`,
    margin + 92,
    y,
  );
  const formulaWidth = pageWidth - margin - 2 - (margin + 92);
  const formulaLines = (
    doc.splitTextToSize(accrual.formula, formulaWidth) as string[]
  ).slice(0, 3);
  formulaLines.forEach((line, index) => {
    doc.text(line, margin + 92, y + 4 + index * 3.6);
  });
  doc.setTextColor(30);
  doc.setFontSize(9);
  doc.text(formatCOP(accrual.value), pageWidth - margin - 2, y, {
    align: "right",
  });
  y += Math.max(12, 6 + (formulaLines.length - 1) * 3.6 + 4);

  if (accrual.transport > 0 && accrual.concept !== "vacaciones") {
    doc.setFontSize(7.6);
    doc.setTextColor(110);
    doc.text(
      `Incluye auxilio de transporte de ${formatCOP(accrual.transport)} (no constitutivo de salario).`,
      margin + 2,
      y,
    );
    y += 7;
  }

  if (accrual.priorPayments.length > 0) {
    doc.setDrawColor(215);
    y += 2;
    doc.line(margin, y - 4, pageWidth - margin, y - 4);
    y += 4;
    accrual.priorPayments.forEach((payment) => {
      doc.setFontSize(8.2);
      doc.setTextColor(30);
      doc.text("Abonos previos del mismo concepto", margin + 2, y);
      doc.setTextColor(110);
      doc.setFontSize(7.4);
      doc.text(payment.detail, margin + 92, y);
      doc.setTextColor(30);
      doc.setFontSize(8.6);
      doc.text(`- ${formatCOP(payment.amount)}`, pageWidth - margin - 2, y, {
        align: "right",
      });
      y += 6.5;
    });
  }

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, maxWidth, 13, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("VALOR NETO A PAGAR", margin + 3, y + 8.5);
  doc.setFontSize(12);
  doc.text(formatCOP(accrual.net), pageWidth - margin - 3, y + 8.5, {
    align: "right",
  });
  y += 17;

  doc.setTextColor(30);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    `Son ${numberToWords(accrual.net)} pesos M/CTE.`,
    margin,
    y,
  );
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(100);
  const legal = doc.splitTextToSize(accrual.legalText, maxWidth) as string[];
  doc.text(legal, margin, y);
  y += legal.length * 4 + 6;

  if (company.payrollAccountNumber) {
    doc.setFontSize(7.6);
    doc.text(
      `Forma de pago: transferencia a la cuenta ${company.payrollAccountType === "D" ? "de ahorros" : "corriente"} ${company.payrollAccountNumber} del banco ${company.payrollBank ?? "de la empresa"}, o al fondo de cesantías registrado por el trabajador.`,
      margin,
      y,
    );
    y += 5;
  }

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    accrual.concept === "cesantias"
      ? "El trabajador declara recibir el valor descrito y autoriza su consignación al fondo de cesantías."
      : accrual.concept === "vacaciones"
        ? "El trabajador declara recibir el valor descrito y autoriza el abono en su cuenta bancaria."
        : "El trabajador declara recibir el valor descrito y autoriza el abono en su cuenta bancaria.",
    margin,
    y,
  );

  const signatureY = pageHeight - 52;
  const observationsTop = y + 6;
  const observationsHeight = Math.min(24, signatureY - 15 - observationsTop);
  if (observationsHeight > 12) {
    doc.setDrawColor(210);
    doc.roundedRect(margin, observationsTop, maxWidth, observationsHeight, 2, 2, "S");
    doc.setTextColor(120);
    doc.setFontSize(6.8);
    doc.text("OBSERVACIONES", margin + 3, observationsTop + 5);
    doc.setDrawColor(232);
    [11, 17].forEach((offset) => {
      if (offset < observationsHeight - 2) {
        doc.line(
          margin + 3,
          observationsTop + offset,
          pageWidth - margin - 3,
          observationsTop + offset,
        );
      }
    });
  }

  const half = maxWidth / 2 - 6;

  doc.setDrawColor(60);
  doc.line(margin, signatureY, margin + half, signatureY);
  doc.line(pageWidth - margin - half, signatureY, pageWidth - margin, signatureY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(company.legalRep || "Representante legal", margin, signatureY + 5);
  doc.text(fullName(employee), pageWidth - margin - half, signatureY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(
    (doc.splitTextToSize(
      `Representante legal · ${company.name}`,
      half - 4,
    ) as string[]).slice(0, 2),
    margin,
    signatureY + 9.5,
  );
  doc.text(
    (doc.splitTextToSize(
      `${employee.docType} ${employee.docNumber} · Recibí conforme ${formatDateLong(todayIso)}`,
      half - 4,
    ) as string[]).slice(0, 2),
    pageWidth - margin - half,
    signatureY + 9.5,
  );

  finishLetterhead(doc, company, consecutive ?? accrual.reference);
  savePdfFile(doc, 
    `plantilla-${accrual.concept}-${employee.docNumber.replace(/\W+/g, "")}.pdf`,
  );
};

export interface BulkAccrualRow {
  employee: Employee;
  accrual: AccrualTemplate;
}

/** Plantilla general de un concepto para varios colaboradores. */
export const downloadBulkAccrualPdf = async (
  rows: BulkAccrualRow[],
  company: Company,
  consecutive?: string,
): Promise<void> => {
  if (rows.length === 0) return;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  const todayIso = new Date().toISOString().slice(0, 10);
  const concept = rows[0].accrual.concept;
  const total = rows.reduce((sum, row) => sum + row.accrual.net, 0);

  const header = () =>
    drawLetterhead(doc, company, {
      title: `Plantilla de pago de ${ACCRUAL_LABELS[concept].toLowerCase()}`,
      subtitle: `${rows.length} colaboradores · corte ${formatDateLong(rows[0].accrual.cutoff)}`,
      consecutive,
      issuedAt: todayIso,
    });

  let y = header() + 3;

  const columns = [
    { label: "Colaborador", width: 46 },
    { label: "Documento", width: 24 },
    { label: "Ingreso", width: 18 },
    { label: "Días", width: 12 },
    { label: "Valor", width: 25 },
    { label: "Abonos", width: 23 },
    { label: "Neto", width: 26 },
  ];
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  const drawHeaderRow = () => {
    doc.setFillColor(30, 25, 70);
    doc.rect(margin, y, totalWidth, 7, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    let x = margin + 2;
    columns.forEach((column) => {
      doc.text(column.label, x, y + 4.8);
      x += column.width;
    });
    y += 10;
  };

  drawHeaderRow();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);

  rows.forEach(({ employee, accrual }) => {
    if (y > pageHeight - 45) {
      doc.addPage();
      y = header() + 3;
      drawHeaderRow();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
    }
    const cells = [
      fullName(employee),
      `${employee.docType} ${employee.docNumber}`,
      employee.startDate
        ? `${employee.startDate.slice(8, 10)}/${employee.startDate.slice(5, 7)}/${employee.startDate.slice(0, 4)}`
        : "—",
      accrual.days.toLocaleString("es-CO", { maximumFractionDigits: 1 }),
      formatCOP(accrual.value),
      accrual.priorTotal > 0 ? formatCOP(accrual.priorTotal) : "—",
      formatCOP(accrual.net),
    ];
    let x = margin + 2;
    doc.setTextColor(30);
    cells.forEach((cell, index) => {
      const column = columns[index];
      const lines = doc.splitTextToSize(String(cell), column.width - 3) as string[];
      doc.text(lines.slice(0, 2), x, y);
      x += column.width;
    });
    y += 7.6;
    doc.setDrawColor(228);
    doc.line(margin, y - 3, margin + totalWidth, y - 3);
  });

  if (y > pageHeight - 55) {
    doc.addPage();
    y = header() + 3;
  }

  doc.setFillColor(30, 25, 70);
  doc.rect(margin, y, totalWidth, 9, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.6);
  doc.text("TOTAL A PAGAR", margin + 2, y + 6);
  doc.text(formatCOP(total), margin + totalWidth - 2, y + 6, {
    align: "right",
  });
  y += 14;

  doc.setTextColor(70);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.6);
  doc.text(
    `Son ${numberToWords(total)} pesos M/CTE.`,
    margin,
    y,
  );
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(110);
  const legal = doc.splitTextToSize(ACCRUAL_LEGAL[concept], maxWidth) as string[];
  doc.text(legal, margin, y);

  const signatureY = pageHeight - 42;
  doc.setDrawColor(60);
  doc.line(margin, signatureY, margin + 70, signatureY);
  doc.setTextColor(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(company.legalRep || "Representante legal", margin, signatureY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Representante legal · ${company.name}`, margin, signatureY + 9);

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, `plantilla-general-${concept}-${todayIso}.pdf`);
};
