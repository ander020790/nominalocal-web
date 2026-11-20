import type { jsPDF } from "jspdf";
import type { Company } from "@/data/types";
import { formatDateLong } from "@/lib/format";

const GOLD: [number, number, number] = [176, 141, 79];
const INK: [number, number, number] = [40, 40, 48];
const MUTED: [number, number, number] = [110, 110, 120];

export const LETTERHEAD_MARGIN = 15;
const HEADER_TOP = 11;
const HEADER_HEIGHT = 26;

export interface LetterheadInfo {
  title: string;
  subtitle?: string;
  consecutive?: string;
  issuedAt?: string;
  extra?: string;
}

export const letterheadTop = () => HEADER_TOP + HEADER_HEIGHT + 11;
export const letterheadBottom = (doc: jsPDF) =>
  doc.internal.pageSize.getHeight() - 25;

const pageWidthOf = (doc: jsPDF) => doc.internal.pageSize.getWidth();

const fitImage = (
  doc: jsPDF,
  data: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  opacity?: number,
) => {
  const properties = doc.getImageProperties(data);
  const ratio = Math.min(maxWidth / properties.width, maxHeight / properties.height);
  const width = properties.width * ratio;
  const height = properties.height * ratio;
  const type = data.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
  if (opacity !== undefined) {
    doc.saveGraphicsState();
    const gstate = new (doc as unknown as {
      GState: new (options: { opacity: number }) => unknown;
    }).GState({ opacity });
    doc.setGState(gstate as never);
  }
  doc.addImage(
    data,
    type,
    x + (maxWidth - width) / 2,
    y + (maxHeight - height) / 2,
    width,
    height,
  );
  if (opacity !== undefined) doc.restoreGraphicsState();
};

/** Dibuja el encabezado membretado (logo, título del documento, código y consecutivo). */
export const drawLetterhead = (
  doc: jsPDF,
  company: Company,
  info: LetterheadInfo,
) => {
  const pageWidth = pageWidthOf(doc);
  const margin = LETTERHEAD_MARGIN;
  const boxWidth = pageWidth - margin * 2;
  drawWatermark(doc, company);
  const leftWidth = 60;
  const rightWidth = 56;
  const top = HEADER_TOP;

  doc.setDrawColor(70, 70, 78);
  doc.setLineWidth(0.25);
  doc.rect(margin, top, boxWidth, HEADER_HEIGHT);
  doc.line(margin + leftWidth, top, margin + leftWidth, top + HEADER_HEIGHT);
  doc.line(
    pageWidth - margin - rightWidth,
    top,
    pageWidth - margin - rightWidth,
    top + HEADER_HEIGHT,
  );

  if (company.logoData) {
    try {
      fitImage(doc, company.logoData, margin + 3, top + 3, leftWidth - 6, HEADER_HEIGHT - 6);
    } catch (error) {
      console.warn("No se pudo insertar el logo", error);
    }
  } else {
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(company.name.length > 34 ? 7.8 : 10);
    const name = doc.splitTextToSize(company.name, leftWidth - 8) as string[];
    doc.text(name.slice(0, 3), margin + 4, top + 8.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`NIT ${company.nit}`, margin + 4, top + 21);
  }

  const centerLeft = margin + leftWidth + 4;
  const centerWidth = pageWidth - margin - rightWidth - centerLeft - 4;
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.6);
  const title = doc.splitTextToSize(info.title.toUpperCase(), centerWidth) as string[];
  let titleY = top + (info.subtitle ? 12 : 14);
  doc.text(title.slice(0, 2), centerLeft + centerWidth / 2, titleY, {
    align: "center",
  });
  if (info.subtitle) {
    titleY += title.slice(0, 2).length * 4.4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(
      doc.splitTextToSize(info.subtitle, centerWidth)[0] ?? "",
      centerLeft + centerWidth / 2,
      titleY,
      { align: "center" },
    );
  }

  const rightX = pageWidth - margin - rightWidth + 4;
  const rightWidthInner = rightWidth - 8;
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  const codeLines = [
    `Código: ${company.letterheadCode || "GH-FOR-01"}`,
    `Versión: ${company.letterheadVersion || "01"}`,
    `Vigencia: ${company.letterheadValidity || "Vigente"}`,
  ];
  codeLines.forEach((line, index) => {
    doc.text(
      doc.splitTextToSize(line, rightWidthInner)[0] ?? "",
      rightX,
      top + 7 + index * 5.2,
    );
  });

  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, top + HEADER_HEIGHT + 2.5, pageWidth - margin, top + HEADER_HEIGHT + 2.5);

  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  const issued = formatDateLong(info.issuedAt ?? new Date().toISOString().slice(0, 10));
  const label = info.consecutive
    ? `No. ${info.consecutive}  ·  ${issued}`
    : issued;
  doc.text(label, pageWidth - margin, top + HEADER_HEIGHT + 7, {
    align: "right",
  });
  if (info.extra) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(info.extra, margin, top + HEADER_HEIGHT + 7);
  }

  return letterheadTop();
};

/** Dibuja una firma (data URL) y devuelve la altura usada. */
export const addSignatureImage = (
  doc: jsPDF,
  data: string | undefined,
  x: number,
  y: number,
  maxWidth = 45,
  maxHeight = 18,
) => {
  if (!data || !data.startsWith("data:image")) return 0;
  try {
    const properties = doc.getImageProperties(data);
    const ratio = Math.min(
      maxWidth / properties.width,
      maxHeight / properties.height,
    );
    const width = properties.width * ratio;
    const height = properties.height * ratio;
    doc.addImage(data, "PNG", x, y, width, height);
    return height;
  } catch (error) {
    console.warn("No se pudo insertar la firma", error);
    return 0;
  }
};

/** Dibuja el pie membretado con la información de la empresa y el número de página. */
export const drawLetterheadFooter = (
  doc: jsPDF,
  company: Company,
  consecutive?: string,
) => {
  const pageWidth = pageWidthOf(doc);
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = LETTERHEAD_MARGIN;
  const total = doc.getNumberOfPages();

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 19, pageWidth - margin, pageHeight - 19);

    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.text(
      `${company.name.toUpperCase()}  |  NIT ${company.nit}`,
      pageWidth / 2,
      pageHeight - 14,
      { align: "center" },
    );

    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.1);
    doc.text(
      `${company.address}, ${company.city}  |  Tel. ${company.phone}  |  ${company.email}`,
      pageWidth / 2,
      pageHeight - 10.4,
      { align: "center" },
    );

    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.setFontSize(6.1);
    doc.text(`Página ${page}`, pageWidth - margin, pageHeight - 10.4, {
      align: "right",
    });
    if (consecutive) {
      doc.text(`No. ${consecutive}`, margin, pageHeight - 10.4);
    }
  }
};

const drawWatermark = (doc: jsPDF, company: Company) => {
  const pageWidth = pageWidthOf(doc);
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerY = pageHeight / 2 + 20;

  if (company.logoData) {
    try {
      fitImage(doc, company.logoData, pageWidth / 2 - 55, centerY - 35, 110, 60, 0.06);
      return;
    } catch (error) {
      console.warn("No se pudo insertar la marca de agua", error);
    }
  }
  doc.saveGraphicsState();
  const gstate = new (doc as unknown as {
    GState: new (options: { opacity: number }) => unknown;
  }).GState({ opacity: 0.05 });
  doc.setGState(gstate as never);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(company.name.length > 30 ? 20 : 26);
  const lines = doc.splitTextToSize(
    company.name.toUpperCase(),
    pageWidth - LETTERHEAD_MARGIN * 2 - 10,
  ) as string[];
  doc.text(lines.slice(0, 3), pageWidth / 2, centerY - (lines.length - 1) * 4, {
    align: "center",
  });
  doc.restoreGraphicsState();
};

/** Marca de agua y pie en todas las páginas; llamar justo antes de guardar el PDF. */
export const finishLetterhead = (
  doc: jsPDF,
  company: Company,
  consecutive?: string,
) => {
  drawLetterheadFooter(doc, company, consecutive);
};
