import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { parseRutText, type RutData } from "@/lib/rut";

export interface RutParseResult {
  data: RutData;
  textLength: number;
  warning?: string;
}

const MAX_SIZE = 12 * 1024 * 1024;

export const extractRutFromPdf = async (file: File): Promise<RutParseResult> => {
  if (
    !file.name.toLowerCase().endsWith(".pdf") &&
    file.type !== "application/pdf"
  ) {
    throw new Error("Selecciona el RUT en formato PDF.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("El PDF supera los 12 MB. Usa el RUT original de la DIAN.");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  let task: ReturnType<typeof pdfjs.getDocument> | null = null;

  const openDocument = () => {
    const documentOptions = { data, isEvalSupported: false };
    task = pdfjs.getDocument(documentOptions);
    return task.promise;
  };

  try {
    let pdf;
    try {
      pdf = await openDocument();
    } catch (firstError) {
      // Segundo intento: algunas vistas previas bloquean el worker externo.
      // Cargamos el trabajador como módulo embebido (blob) y reintentamos.
      try {
        const workerCode = await fetch(workerUrl).then((response) =>
          response.text(),
        );
        const blobUrl = URL.createObjectURL(
          new Blob([workerCode], { type: "text/javascript" }),
        );
        pdfjs.GlobalWorkerOptions.workerSrc = blobUrl;
        pdf = await openDocument();
      } catch (error) {
        console.error("[RUT] No se pudo leer el PDF", firstError, error);
        const message = `${
          firstError instanceof Error ? firstError.message : ""
        } ${error instanceof Error ? error.message : ""}`;
        throw new Error(
          /password/i.test(message)
            ? "El PDF está protegido con contraseña. Descarga el RUT sin clave."
            : /invalid pdf|structure/i.test(message)
              ? "El archivo no parece un PDF válido de RUT."
              : "No pudimos leer este PDF. Puedes escribir los datos manualmente para continuar.",
        );
      }
    }

    if (!pdf || typeof pdf.getPage !== "function") {
      throw new Error("No pudimos abrir el documento.");
    }
    if (pdf.numPages > 12) {
      throw new Error("El PDF tiene demasiadas páginas para ser un RUT.");
    }

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows: { y: number; cells: { x: number; text: string }[] }[] = [];
      content.items.forEach((item) => {
        if (!("str" in item) || !item.str.trim()) return;
        const x = item.transform?.[4] ?? 0;
        const y = item.transform?.[5] ?? 0;
        let row = rows.find((candidate) => Math.abs(candidate.y - y) < 4);
        if (!row) {
          row = { y, cells: [] };
          rows.push(row);
        }
        row.cells.push({ x, text: item.str });
      });
      rows.sort((a, b) => b.y - a.y);
      const lines = rows.map((row) =>
        row.cells
          .sort((a, b) => a.x - b.x)
          .map((cell) => cell.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      );
      pages.push(lines.join("\n"));
    }

    const text = pages.join("\n");
    const parsed = parseRutText(text);
    const warning =
      parsed.detected.length === 0
        ? "No pudimos leer datos del RUT. Puede ser un PDF escaneado (imagen): ingresa los datos manualmente o descarga el RUT de la DIAN en PDF."
        : parsed.detected.length < 4
          ? "Leímos pocos datos del RUT. Revisa y completa los campos manualmente."
          : undefined;

    return { data: parsed, textLength: text.trim().length, warning };
  } finally {
    if (task && typeof task.destroy === "function") {
      try {
        await task.destroy();
      } catch (error) {
        console.warn("[RUT] No se pudo liberar el documento", error);
      }
    }
  }
};
