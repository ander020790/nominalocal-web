import type { jsPDF } from "jspdf";

/**
 * Descarga el PDF. Si la app corre dentro de un iframe (vista previa), también
 * lo abre en una pestaña nueva para que se pueda guardar manualmente.
 */
export const savePdfFile = (doc: jsPDF, fileName: string) => {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  let embedded = false;
  try {
    embedded = window.self !== window.top;
  } catch {
    embedded = true;
  }
  if (embedded) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
