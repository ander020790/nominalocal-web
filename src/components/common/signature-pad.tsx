import { useEffect, useRef, useState } from "react";
import { Check, Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  value?: string;
  onSave: (dataUrl: string) => Promise<void> | void;
  title?: string;
  description?: string;
}

/** Lienzo para que el colaborador firme con el dedo o el mouse. */
export const SignaturePad = ({
  value,
  onSave,
  title = "Mi firma digital",
  description = "Dibuja tu firma con el dedo o el mouse. Se usará en tus comprobantes y documentos.",
}: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#1f2437";
    context.clearRect(0, 0, rect.width, rect.height);
  }, []);

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    drawingRef.current = true;
    const { x, y } = pointFrom(event);
    context.beginPath();
    context.moveTo(x, y);
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = pointFrom(event);
    context.lineTo(x, y);
    context.stroke();
    setHasInk(true);
  };

  const end = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      await onSave(canvas.toDataURL("image/png"));
      setHasInk(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <PenLine className="size-4 text-primary" /> {title}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {value ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
            <Check className="size-3" /> Guardada
          </span>
        ) : null}
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-dashed border-border bg-card">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
      </div>

      {value && !hasInk ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-[10px] text-muted-foreground">
            Firma actual:
          </span>
          <img
            src={value}
            alt="Firma del colaborador"
            crossOrigin="anonymous"
            className="h-10 w-auto object-contain"
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={clear} type="button">
          <Eraser className="size-3.5" /> Limpiar
        </Button>
        <Button
          size="sm"
          onClick={() => void save()}
          disabled={!hasInk || saving}
          type="button"
        >
          <Check className="size-3.5" /> {saving ? "Guardando…" : "Guardar firma"}
        </Button>
      </div>
    </div>
  );
};
