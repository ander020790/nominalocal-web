import type { Company, Employee } from "@/data/types";
import type { CostLine, CostSummary } from "@/lib/cost-summary";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";
import {
  formatCOP,
  formatDateLong,
  fullName,
  numberToWords,
} from "@/lib/format";

const contractLabel = (value: string) =>
  value === "prestacion-servicios"
    ? "Prestación de servicios"
    : value === "obra-labor"
      ? "Obra o labor"
      : value === "fijo"
        ? "Término fijo"
        : "Indefinido";

export const downloadCostSummaryPdf = async (
  employee: Employee,
  company: Company,
  summary: CostSummary,
  consecutive?: string,
): Promise<void> => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  const right = pageWidth - margin - 2;

  const header = () =>
    drawLetterhead(doc, company, {
      title: "Resumen completo de costo del empleado",
      subtitle: `${fullName(employee)} · ${employee.position}`,
      consecutive,
      issuedAt: new Date().toISOString().slice(0, 10),
      extra: summary.estimated
        ? `Proyección de nómina · corte ${formatDateLong(summary.cutoff)}`
        : `Nómina ${summary.periodLabel} · corte ${formatDateLong(summary.cutoff)}`,
    });

  const ensureSpace = (needed: number, withHeader = true) => {
    if (y + needed <= pageHeight - 22) return;
    doc.addPage();
    y = header() + 3;
  };

  let y = header() + 3;

  const sectionTitle = (title: string, note?: string) => {
    ensureSpace(14);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(title, margin, y);
    y += 4.5;
    if (note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(120);
      doc.text(note, margin, y);
      y += 4;
    } else {
      y += 1.5;
    }
    doc.setDrawColor(210);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const rows = (items: CostLine[], emptyLabel: string) => {
    if (items.length === 0) {
      ensureSpace(8);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.8);
      doc.setTextColor(140);
      doc.text(emptyLabel, margin + 2, y);
      y += 7;
      return;
    }
    items.forEach((item) => {
      ensureSpace(12);
      doc.setTextColor(30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.6);
      doc.text(doc.splitTextToSize(item.label, 82)[0] ?? "", margin + 2, y);
      if (item.detail) {
        doc.setTextColor(115);
        doc.setFontSize(7.2);
        doc.text(
          doc.splitTextToSize(item.detail, 60)[0] ?? "",
          margin + 88,
          y,
        );
      }
      doc.setTextColor(30);
      doc.setFontSize(8.8);
      doc.text(formatCOP(item.amount), right, y, { align: "right" });
      y += 6.2;
    });
    y += 1;
  };

  const totalLine = (label: string, amount: number, strong = false) => {
    ensureSpace(10);
    doc.setDrawColor(220);
    doc.line(margin, y - 3, pageWidth - margin, y - 3);
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setFontSize(strong ? 9.4 : 8.8);
    doc.setTextColor(30);
    doc.text(label, margin + 2, y + 1);
    doc.setFont("helvetica", "bold");
    doc.text(formatCOP(amount), right, y + 1, { align: "right" });
    y += 8;
  };

  const band = (label: string, amount: number, height = 12) => {
    ensureSpace(height + 6);
    doc.setFillColor(30, 25, 70);
    doc.rect(margin, y, maxWidth, height, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.6);
    doc.text(label, margin + 3, y + height / 2 + 1.4);
    doc.setFontSize(11.5);
    doc.text(formatCOP(amount), right + 1, y + height / 2 + 1.4, {
      align: "right",
    });
    y += height + 6;
  };

  const infoRows: [string, string][] = [
    ["Colaborador", fullName(employee)],
    ["Documento", `${employee.docType} ${employee.docNumber}`],
    ["Cargo", employee.position],
    ["Contrato", contractLabel(employee.contractType)],
    ["Ingreso", formatDateLong(employee.startDate)],
    ["Salario base", formatCOP(employee.salary)],
  ];

  doc.setFillColor(244, 243, 251);
  doc.roundedRect(margin, y, maxWidth, 25, 2, 2, "F");
  doc.setFontSize(8.2);
  infoRows.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + 4 + column * (maxWidth / 2);
    const lineY = y + 6 + row * 6.5;
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
  y += 33;

  sectionTitle(
    `1. NÓMINA DEL PERIODO · ${summary.periodLabel.toUpperCase()}`,
    summary.estimated ? "Proyección con los datos vigentes del empleado." : "Valores liquidados en la nómina del periodo.",
  );
  rows(summary.earnings, "Sin devengos registrados.");
  totalLine("Total devengado", summary.gross, true);

  sectionTitle("2. DEDUCCIONES DEL EMPLEADO");
  rows(summary.deductions, "Sin deducciones registradas.");
  totalLine("Total deducciones", summary.deductionsTotal, true);
  band("NETO PAGADO AL EMPLEADO", summary.net);

  sectionTitle(
    "3. APORTES A CARGO DE LA EMPRESA",
    "Seguridad social, parafiscales y riesgos laborales del periodo.",
  );
  rows(summary.contributions, "Sin aportes patronales.");
  totalLine("Total aportes patronales", summary.employerTotal, true);
  totalLine("Costo de nómina (devengado + aportes)", summary.payrollCost, true);

  ensureSpace(72);
  sectionTitle(
    "4. PRESTACIONES SOCIALES CAUSADAS AL CORTE",
    "Valores acumulados a la fecha de corte, con los pagos parciales ya descontados.",
  );
  summary.accruals.forEach((accrual) => {
    ensureSpace(14);
    doc.setTextColor(30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    doc.text(accrual.label, margin + 2, y);
    doc.setTextColor(115);
    doc.setFontSize(7.2);
    doc.text(doc.splitTextToSize(accrual.detail, 62)[0] ?? "", margin + 88, y);
    doc.setTextColor(30);
    doc.setFontSize(8.8);
    doc.text(formatCOP(accrual.value), right, y, { align: "right" });
    y += 6.2;
  });
  y += 1;
  totalLine("Total prestaciones causadas", summary.accrualsGross, true);
  if (summary.accrualsPaid > 0) {
    ensureSpace(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(30);
    doc.text("Pagos parciales ya realizados", margin + 2, y + 1);
    doc.text(`- ${formatCOP(summary.accrualsPaid)}`, right, y + 1, {
      align: "right",
    });
    y += 7;
  }
  totalLine("Saldo de prestaciones por pagar", summary.accrualsNet, true);

  ensureSpace(26);
  band("COSTO TOTAL DEL EMPLEADO", summary.totalCost, 14);
  doc.setTextColor(60);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.8);
  doc.text(
    `Son ${numberToWords(summary.totalCost)} pesos M/CTE.`,
    margin,
    y,
  );
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(105);
  const note = doc.splitTextToSize(
    `El costo total suma la nómina del periodo (devengos más aportes patronales) y el saldo de prestaciones sociales causadas al ${formatDateLong(summary.cutoff)}: cesantías, intereses, prima de servicios y vacaciones. Las provisiones mensuales registradas (${formatCOP(summary.provisions.reduce((total, line) => total + line.amount, 0))}) no se suman para evitar duplicar el valor. Estimación de gestión interna; no sustituye la revisión de un contador o abogado laboral.`,
    maxWidth,
  ) as string[];
  doc.text(note, margin, y);

  const signatureY = Math.min(pageHeight - 42, y + 16);
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

  doc.setFontSize(6.6);
  doc.setTextColor(130);
  doc.text(
    `Resumen generado el ${formatDateLong(new Date().toISOString().slice(0, 10))} · Nómina Clara`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" },
  );

  finishLetterhead(doc, company, consecutive);
  savePdfFile(doc, 
    `costo-empleado-${employee.docNumber.replace(/\W+/g, "")}-${summary.period}.pdf`,
  );
};
