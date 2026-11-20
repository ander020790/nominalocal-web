import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractRutFromPdf } from "@/lib/rut-pdf";
import type { RutData } from "@/lib/rut";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "reading" | "done" | "error";

export const RutUpload = ({
  onExtracted,
}: {
  onExtracted: (data: RutData) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState("");
  const [detected, setDetected] = useState<string[]>([]);
  const [summary, setSummary] = useState<RutData | null>(null);
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setState("reading");
    setMessage("");
    setDetail("");
    try {
      const result = await extractRutFromPdf(file);
      setDetected(result.data.detected);
      setSummary(result.data);
      setMessage(result.warning ?? "");
      setState("done");
      onExtracted(result.data);
    } catch (error) {
      console.error("[RUT] Error al cargar el archivo", error);
      setDetected([]);
      setSummary(null);
      setDetail(error instanceof Error ? error.message : String(error));
      setMessage(
        error instanceof Error
          ? error.message
          : "No pudimos leer el PDF. Inténtalo de nuevo.",
      );
      setState("error");
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void handleFile(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "rounded-xl border border-dashed p-4 transition-colors",
        dragging
          ? "border-primary bg-primary-soft/60"
          : "border-border bg-muted/30",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <FileUp className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Cargar RUT en PDF
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Arrastra el RUT descargado de la DIAN y completamos razón social,
              NIT, dirección, contacto y representante legal. Puedes corregir
              todo antes de guardar.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={state === "done" ? "outline" : "default"}
          size="sm"
          className="shrink-0"
          disabled={state === "reading"}
          onClick={() => inputRef.current?.click()}
        >
          {state === "reading" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Leyendo…
            </>
          ) : state === "done" ? (
            <>
              <RotateCcw className="size-3.5" /> Cargar otro
            </>
          ) : (
            <>
              <FileUp className="size-3.5" /> Seleccionar PDF
            </>
          )}
        </Button>
      </div>

      {fileName && state !== "idle" ? (
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          {fileName}
        </p>
      ) : null}

      {state === "done" && detected.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
            <CheckCircle2 className="size-3.5" /> Datos encontrados:
          </span>
          {detected.map((item) => (
            <span
              key={item}
              className="rounded-full border border-success/20 bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {state === "done" && summary ? (
        <div className="mt-3 grid gap-x-4 gap-y-1.5 rounded-lg border border-border bg-card p-3 text-[11px] sm:grid-cols-2">
          {[
            ["Razón social", summary.name],
            ["NIT", summary.nit],
            ["Dirección", summary.address],
            ["Ciudad", summary.city],
            ["Departamento", summary.department],
            ["Teléfono", summary.phone],
            ["Correo", summary.email],
            ["Actividad", summary.economicActivity],
            ["Representante", summary.legalRep],
            ["Documento rep.", summary.legalRepDoc],
            ["Responsabilidades", summary.taxResponsibilities],
            [
              `Puntos de venta${
                summary.pointsOfSale.length
                  ? ` (${summary.pointsOfSale.length})`
                  : ""
              }`,
              summary.pointsOfSale.map((point) => point.name).join(", "),
            ],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <p key={label} className="flex gap-1.5">
                <span className="shrink-0 font-medium text-foreground">
                  {label}:
                </span>
                <span className="truncate text-muted-foreground" title={value}>
                  {value}
                </span>
              </p>
            ))}
        </div>
      ) : null}

      {state === "error" && detail ? (
        <p className="mt-1 break-words text-[10px] text-muted-foreground">
          Detalle técnico: {detail}
        </p>
      ) : null}

      {message ? (
        <p
          className={cn(
            "mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-relaxed",
            state === "error"
              ? "bg-destructive-soft text-destructive"
              : "bg-warning-soft text-warning",
          )}
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {message}
            {state === "error"
              ? " También puedes escribir los datos de la empresa manualmente y continuar."
              : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
};
