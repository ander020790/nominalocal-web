import { supabase } from "@/integrations/supabase/client";

const PREFIXES: Record<string, string> = {
  "contrato-indefinido": "CTR-IND",
  "contrato-fijo": "CTR-FIJ",
  "contrato-obra-labor": "CTR-OBR",
  "contrato-prestacion-servicios": "CTR-PRS",
  pagare: "PAG",
  confidencialidad: "ACU-CON",
  "politica-ventas": "POL-VEN",
  "acuerdo-terminacion": "ACU-TER",
  "carta-renuncia": "CAR-REN",
  "certificado-laboral": "CERT-LAB",
  "comprobante-nomina": "NOM",
  "liquidacion-final": "LIQ-FIN",
  "liquidacion-general": "LIQ-GEN",
  "plantilla-cesantias": "PLA-CES",
  "plantilla-prima": "PLA-PRI",
  "plantilla-vacaciones": "PLA-VAC",
  "costo-empleado": "COS-EMP",
  prestamo: "PRE",
  "pago-prestacion": "PAG-PRE",
  "liquidacion-nomina": "NOM-LIQ",
  "acta-suspension": "SUS",
};

/**
 * Reserva el siguiente consecutivo de documento para la empresa.
 * Devuelve un texto tipo "CTR-IND-0001".
 */
export const nextConsecutive = async (
  companyId: string,
  kind: string,
): Promise<string> => {
  const prefix = PREFIXES[kind] ?? "DOC";
  const { data, error } = await supabase.rpc("payroll_next_document_number", {
    p_company_id: companyId,
    p_kind: kind,
  });
  if (error || data === null || data === undefined) {
    console.warn("No se pudo obtener el consecutivo del documento", error);
    return "";
  }
  return `${prefix}-${String(data).padStart(4, "0")}`;
};
