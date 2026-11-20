import type { Company, Employee } from "@/data/types";
import { formatDateLong, fullName } from "@/lib/format";
import { addSignatureImage, drawLetterhead, finishLetterhead, letterheadBottom } from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";

export interface WarningDocument {
  warningDate: string;
  reason: string;
  description: string;
  severity: string;
}

export const downloadWarningPdf = async (
  warning: WarningDocument,
  employee: Employee,
  company: Company,
  consecutive?: string,
  printWindow?: Window,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const info = {
    title: "Llamado de atención",
    subtitle: fullName(employee),
    consecutive,
    issuedAt: warning.warningDate,
  };
  let y = drawLetterhead(doc, company, info) + 5;
  const newPage = () => {
    doc.addPage();
    y = drawLetterhead(doc, company, info) + 5;
  };
  const paragraph = (text: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(30);
    const lines = doc.splitTextToSize(text, width) as string[];
    for (const line of lines) {
      if (y + 5 > letterheadBottom(doc)) newPage();
      doc.text(line, margin, y);
      y += 5;
    }
    y += 4;
  };

  paragraph(`Fecha: ${formatDateLong(warning.warningDate)}\nColaborador: ${fullName(employee)}\nDocumento: ${employee.docType} ${employee.docNumber}\nCargo: ${employee.position}`);
  paragraph(`Motivo: ${warning.reason}`, true);
  paragraph(`Gravedad registrada: ${warning.severity.replace(/-/g, " ")}`);
  paragraph("Descripción de los hechos", true);
  paragraph(warning.description.trim() || "Sin descripción adicional registrada.");
  paragraph("Constancia de notificación: la firma del trabajador acredita la recepción de este documento y no implica aceptación de los hechos.");

  if (y + 42 > letterheadBottom(doc)) newPage();
  const signatureY = y + 20;
  const right = margin + width / 2 + 5;
  addSignatureImage(doc, company.signatureData, margin, signatureY - 15, 55, 13);
  addSignatureImage(doc, employee.signatureData, right, signatureY - 15, 55, 13);
  doc.setDrawColor(60);
  doc.line(margin, signatureY, margin + 72, signatureY);
  doc.line(right, signatureY, right + 72, signatureY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(company.legalRep || "Representante legal", 72), margin, signatureY + 5);
  doc.text(doc.splitTextToSize(fullName(employee), 72), right, signatureY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Representante legal", margin, signatureY + 13);
  doc.text(`${employee.docType} ${employee.docNumber} · Trabajador(a)`, right, signatureY + 13);
  finishLetterhead(doc, company, consecutive);
  if (printWindow) {
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output("blob"));
    printWindow.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
  } else {
    savePdfFile(doc, `llamado-atencion-${employee.docNumber.replace(/\W+/g, "")}-${warning.warningDate}.pdf`);
  }
};
