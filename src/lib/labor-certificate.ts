import type { Company, Employee } from "@/data/types";
import { formatCOP, formatDateLong, fullName } from "@/lib/format";
import {
  addSignatureImage,
  drawLetterhead,
  finishLetterhead,
} from "@/lib/letterhead";
import { savePdfFile } from "@/lib/save-pdf";
import { transportAllowanceFor } from "@/lib/payroll";

const contractLabels: Record<Employee["contractType"], string> = {
  indefinido: "término indefinido",
  fijo: "término fijo",
  "obra-labor": "obra o labor contratada",
  "prestacion-servicios": "prestación de servicios",
};

export const downloadLaborCertificate = async (
  employee: Employee,
  company: Company,
  consecutive?: string,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;
  const today = formatDateLong(new Date().toISOString().slice(0, 10));

  let y = drawLetterhead(doc, company, {
    title: "Certificado laboral",
    subtitle: fullName(employee),
    consecutive,
  });
  y += 2;

  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.2);
  const paragraph = (text: string, gap = 5) => {
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    lines.forEach((line) => {
      doc.text(line, margin, y);
      y += gap;
    });
    y += 3;
  };

  paragraph(
    `${company.name}, identificada con NIT ${company.nit}, con domicilio en ${company.address}, ${company.city}, representada legalmente por ${company.legalRep || "su representante legal"}${company.legalRepDoc ? `, identificado(a) con ${company.legalRepDoc}` : ""}, certifica que:`,
    5.5,
  );

  paragraph(
    employee.contractType === "prestacion-servicios"
      ? `${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, presta sus servicios a esta empresa mediante contrato de prestación de servicios, desempeñando el cargo de ${employee.position} en el área de ${employee.department}, desde el ${formatDateLong(employee.startDate)}.`
      : `${fullName(employee)}, identificado(a) con ${employee.docType} ${employee.docNumber}, se encuentra vinculado(a) a esta empresa mediante contrato de trabajo a ${contractLabels[employee.contractType]}, desempeñando el cargo de ${employee.position} en el área de ${employee.department}, desde el ${formatDateLong(employee.startDate)}.`,
    5.5,
  );

  const allowance = transportAllowanceFor(employee, company);
  paragraph(
    employee.integralSalary
      ? `Su remuneración es un salario integral de ${formatCOP(employee.salary)} mensuales, que incluye el pago de prestaciones sociales y demás conceptos legales.`
      : `Su salario básico mensual es de ${formatCOP(employee.salary)}${allowance > 0 ? `, más un auxilio de transporte de ${formatCOP(allowance)} que no constituye salario` : ""}.`,
    5.5,
  );

  paragraph(
    employee.status === "retirado" && employee.endDate
      ? `El colaborador laboró en la empresa hasta el ${formatDateLong(employee.endDate)}.`
      : "El colaborador se encuentra actualmente activo en la empresa.",
    5.5,
  );

  paragraph(
    `Se expide en ${company.city}, a los ${today}, a solicitud del interesado para los fines que estime convenientes.`,
    5.5,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  addSignatureImage(doc, company.signatureData, margin, y - 18, 45, 14);
  doc.text(company.legalRep || "Representante legal", margin, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  if (company.legalRepDoc) {
    doc.text(company.legalRepDoc, margin, y);
    y += 4.5;
  }
  doc.text(`Representante legal · ${company.name}`, margin, y);
  y += 4.5;
  doc.text(`NIT ${company.nit}`, margin, y);

  finishLetterhead(doc, company, consecutive);

  savePdfFile(doc, 
    `certificado-laboral-${employee.docNumber.replace(/\W+/g, "")}.pdf`,
  );
};
