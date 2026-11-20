import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { calculatePayroll } from "@/lib/payroll";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Download,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { nextConsecutive } from "@/lib/consecutive";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/common/status-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/context/app-context-value";
import {
  formatCOP,
  formatDate,
  formatMonth,
  fullName,
} from "@/lib/format";
import { payrollTotals } from "@/lib/payroll";
import { downloadPayslipPdf } from "@/lib/payslip";
import type { Payroll, PayrollLine } from "@/data/types";

const LineRow = ({
  line,
  editable,
  onChange,
  onRemove,
}: {
  line: PayrollLine;
  editable: boolean;
  onChange: (amount: number) => void;
  onRemove: () => void;
}) => {
  const [draft, setDraft] = useState(String(line.amount));

  useEffect(() => {
    setDraft(String(line.amount));
  }, [line.amount]);

  const commit = () => {
    const value = Number(draft);
    if (!Number.isNaN(value) && value !== line.amount) {
      onChange(value);
    }
  };

  return (
  <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-medium text-foreground">
        {line.label}
      </p>
      {line.detail ? (
        <p className="truncate text-[10px] text-muted-foreground">
          {line.detail}
        </p>
      ) : null}
    </div>
    {editable && line.amount > 0 ? (
      <Input
        type="number"
        value={draft}
        step={1000}
        min={0}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-8 w-28 text-right text-xs tabular-nums"
      />
    ) : (
      <span className="w-28 text-right text-xs font-semibold tabular-nums text-foreground">
        {formatCOP(line.amount)}
      </span>
    )}
    {editable ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        onClick={onRemove}
        aria-label={`Eliminar ${line.label}`}
      >
        <Trash2 className="size-3.5" />
      </Button>
    ) : (
      <span className="w-7" />
    )}
  </div>
  );
};

export const PayrollSheet = ({
  payroll,
  open,
  onOpenChange,
  locked = false,
  onDelete,
}: {
  payroll: Payroll | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locked?: boolean;
  onDelete?: (payrollId: string) => void | Promise<void>;
}) => {
  const {
    companyEmployees,
    currentCompany,
    updatePayrollLine,
    addPayrollLine,
    removePayrollLine,
    setPayrollStatus,
    refresh,
  } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [generationForm, setGenerationForm] = useState({
    days: 15,
    paymentDate: "",
  });
  const [generationBusy, setGenerationBusy] = useState(false);
  const [genLine, setGenLine] = useState({
    label: "",
    amount: 0,
    kind: "earning" as "earning" | "deduction",
  });
  const [newLine, setNewLine] = useState({
    label: "",
    amount: 0,
    kind: "earning" as PayrollLine["kind"],
  });

  if (!payroll || !currentCompany) return null;
  const employee = companyEmployees.find(
    (item) => item.id === payroll.employeeId,
  );
  if (!employee) return null;

  const totals = payrollTotals(payroll.lines);
  const editable = payroll.status !== "pagado" && !locked;
  const earnings = payroll.lines.filter((line) => line.kind === "earning");
  const deductions = payroll.lines.filter((line) => line.kind === "deduction");
  const employerLines = payroll.lines.filter((line) => line.kind === "employer");
  const aportes = employerLines.filter((line) => line.group === "aportes");
  const provisions = employerLines.filter(
    (line) => line.group === "provisiones",
  );

  const submitLine = () => {
    if (!newLine.label.trim() || newLine.amount <= 0) return;
    const group =
      newLine.kind === "earning"
        ? "devengo"
        : newLine.kind === "deduction"
          ? "deduccion"
          : "aportes";
    void addPayrollLine(payroll.id, {
      kind: newLine.kind,
      group,
      label: newLine.label.trim(),
      amount: Math.round(newLine.amount),
    });
    setNewLine({ label: "", amount: 0, kind: "earning" });
    setAddOpen(false);
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto scrollbar-slim sm:max-w-[620px]">
        <SheetHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="font-display text-xl">
                {fullName(employee)}
              </SheetTitle>
              <SheetDescription>
                {employee.position} · {formatMonth(payroll.period)} · Quincena{" "}
                {payroll.fortnight}
                {payroll.paymentDate
                  ? ` · Liquidación ${formatDate(payroll.paymentDate)}`
                  : ""}
              </SheetDescription>
            </div>
            <StatusPill status={payroll.status} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Neto
              </p>
              <p className="text-sm font-bold text-foreground">
                {formatCOP(totals.net)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Devengado
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCOP(totals.gross)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                IBC
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCOP(payroll.ibc)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Coste empresa
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCOP(totals.totalCost)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const consecutive = await nextConsecutive(
                  currentCompany.id,
                  "comprobante-nomina",
                );
                await downloadPayslipPdf(
                  payroll,
                  employee,
                  currentCompany,
                  consecutive,
                );
              }}
            >
              <Download className="size-3.5" /> Recibo PDF
            </Button>
            {!locked && payroll.status === "borrador" ? (
              <Button
                size="sm"
                onClick={() => void setPayrollStatus(payroll.id, "revisado")}
              >
                <CheckCircle2 className="size-3.5" /> Marcar revisada
              </Button>
            ) : null}
            {!locked && payroll.status === "revisado" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm">
                    <Lock className="size-3.5" /> Marcar pagada
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar pago de la nómina?</AlertDialogTitle>
                    <AlertDialogDescription>
                      La nómina de {fullName(employee)} quedará cerrada y el
                      recibo será visible en el portal del empleado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void setPayrollStatus(payroll.id, "pagado")}
                    >
                      Confirmar pago
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            {editable ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setGenerationForm({
                    days: payroll.daysWorked ?? 15,
                    paymentDate:
                      payroll.paymentDate ??
                      new Date().toISOString().slice(0, 10),
                  });
                  setGenerationOpen(true);
                }}
              >
                <Pencil className="size-3.5" /> Editar generación
              </Button>
            ) : null}
            {!locked && onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta nómina?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se borrará la nómina de {fullName(employee)} de la
                      quincena {payroll.fortnight} de{" "}
                      {formatMonth(payroll.period)}. Después podrás generarla de
                      nuevo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void onDelete(payroll.id)}
                    >
                      Eliminar nómina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            {!locked && payroll.status !== "borrador" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void setPayrollStatus(payroll.id, "borrador")}
              >
                <RotateCcw className="size-3.5" /> Reabrir
              </Button>
            ) : null}
            {locked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
                <Lock className="size-3" /> Periodo finalizado
              </span>
            ) : null}
          </div>
        </SheetHeader>

        <Separator />

        <div className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3 text-[11px] text-muted-foreground">
            <p>
              Contrato:{" "}
              <span className="font-medium capitalize text-foreground">
                {employee.contractType.replace("-", " ")}
              </span>
            </p>
            <p>
              Ingreso:{" "}
              <span className="font-medium text-foreground">
                {formatDate(employee.startDate)}
              </span>
            </p>
            <p>
              Punto:{" "}
              <span className="font-medium text-foreground">
                {currentCompany.pointsOfSale.find(
                  (pos) => pos.id === employee.pointOfSaleId,
                )?.name ?? "—"}
              </span>
            </p>
            <p>
              Auxilio transporte:{" "}
              <span className="font-medium text-foreground">
                {earnings.some((line) => line.label === "Auxilio de transporte")
                  ? "Incluido"
                  : "No aplica"}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-primary/20 bg-primary-soft/40 p-3 text-[11px] text-muted-foreground">
            <p>
              EPS:{" "}
              <span className="font-medium text-foreground">
                {employee.eps || "Sin registrar"}
              </span>
            </p>
            <p>
              Pensión:{" "}
              <span className="font-medium text-foreground">
                {employee.pensionFund || "Sin registrar"}
              </span>
            </p>
            <p>
              ARL:{" "}
              <span className="font-medium text-foreground">
                {employee.arlProvider || "Sin registrar"}
              </span>{" "}
              · Nivel {employee.riskLevel}
            </p>
            <p>
              Caja de compensación:{" "}
              <span className="font-medium text-foreground">
                {employee.compensationFund || "Sin registrar"}
              </span>
            </p>
          </div>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-success">
                Devengos
              </h3>
              <span className="text-xs font-semibold text-foreground">
                {formatCOP(totals.gross)}
              </span>
            </div>
            <div className="rounded-xl border border-border p-1">
              {earnings.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  editable={editable}
                  onChange={(amount) =>
                    void updatePayrollLine(payroll.id, line.id, amount)
                  }
                  onRemove={() => void removePayrollLine(payroll.id, line.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Deducciones
              </h3>
              <span className="text-xs font-semibold text-foreground">
                {formatCOP(totals.deductions)}
              </span>
            </div>
            <div className="rounded-xl border border-border p-1">
              {deductions.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  editable={editable}
                  onChange={(amount) =>
                    void updatePayrollLine(payroll.id, line.id, amount)
                  }
                  onRemove={() => void removePayrollLine(payroll.id, line.id)}
                />
              ))}
            </div>
          </section>

          {editable ? (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" /> Agregar concepto a la nómina
            </Button>
          ) : (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
              <Lock className="mr-1 inline size-3" />
              {locked
                ? "Periodo finalizado. Reabre la nómina desde Nóminas para modificar conceptos."
                : "Nómina cerrada. Reábrela para modificar conceptos."}
            </p>
          )}

          <section className="rounded-xl bg-muted/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total devengado</span>
              <span className="font-medium text-foreground">
                {formatCOP(totals.gross)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total deducciones</span>
              <span className="font-medium text-foreground">
                − {formatCOP(totals.deductions)}
              </span>
            </div>
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Neto a pagar
              </span>
              <span className="font-display text-lg font-bold text-primary">
                {formatCOP(totals.net)}
              </span>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="size-3.5" /> Aportes del empleador
            </h3>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              {aportes.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between gap-2 py-2 text-xs"
                >
                  <span className="min-w-0 text-muted-foreground">
                    {line.label}
                    {line.detail ? (
                      <span className="block text-[10px] text-muted-foreground/70">
                        {line.detail}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCOP(line.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Provisiones prestacionales
            </h3>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              {provisions.length === 0 ? (
                <p className="py-2 text-[11px] text-muted-foreground">
                  Salario integral: las prestaciones ya están incluidas en la
                  remuneración.
                </p>
              ) : (
                provisions.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCOP(line.amount)}
                    </span>
                  </div>
                ))
              )}
              <div className="flex items-center justify-between py-2 text-xs">
                <span className="font-semibold text-foreground">
                  Coste total empresa
                </span>
                <span className="font-bold tabular-nums text-foreground">
                  {formatCOP(totals.totalCost)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Cálculo estimado con parámetros {currentCompany.params.year}:
              SMMLV {formatCOP(currentCompany.params.smmlv)}, auxilio de
              transporte {formatCOP(currentCompany.params.transportAllowance)} y
              UVT {formatCOP(currentCompany.params.uvt)}. No sustituye la
              revisión de un contador.
            </p>
          </section>
        </div>
      </SheetContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Agregar concepto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Concepto
              </Label>
              <Input
                value={newLine.label}
                onChange={(event) =>
                  setNewLine((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Comisiones, bono, préstamo…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Tipo
                </Label>
                <Select
                  value={newLine.kind}
                  onValueChange={(value) =>
                    setNewLine((current) => ({
                      ...current,
                      kind: value as PayrollLine["kind"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Devengo</SelectItem>
                    <SelectItem value="deduction">Deducción</SelectItem>
                    <SelectItem value="employer">Aporte empleador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Valor (COP)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={newLine.amount || ""}
                  onChange={(event) =>
                    setNewLine((current) => ({
                      ...current,
                      amount: Number(event.target.value),
                    }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              El cambio recalcula los totales del recibo y deja la nómina en
              estado revisado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitLine}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>

      <Dialog open={generationOpen} onOpenChange={setGenerationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Editar generación de nómina
            </DialogTitle>
            <DialogDescription>
              Ajusta los días liquidados y la fecha de pago; se recalcularán
              devengos, deducciones y aportes del colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Devengos y deducciones
              </p>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1 scrollbar-slim">
                {payroll.lines
                  .filter((line) => line.kind !== "employer")
                  .map((line) => (
                    <div key={line.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                        {line.label}
                      </span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={line.amount}
                        onBlur={(event) =>
                          void updatePayrollLine(
                            payroll.id,
                            line.id,
                            Number(event.target.value) || 0,
                          )
                        }
                        className="h-8 w-24 rounded-md border border-input bg-transparent px-2 text-right text-xs"
                      />
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          void removePayrollLine(payroll.id, line.id)
                        }
                        aria-label={`Eliminar ${line.label}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_90px_100px_auto] items-end gap-2 rounded-lg border border-dashed border-border p-2">
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">
                  Concepto
                </label>
                <input
                  value={genLine.label}
                  onChange={(event) =>
                    setGenLine((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                  placeholder="Horas extra, bonificación, préstamo…"
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">
                  Valor
                </label>
                <input
                  type="number"
                  min={0}
                  value={genLine.amount || ""}
                  onChange={(event) =>
                    setGenLine((current) => ({
                      ...current,
                      amount: Number(event.target.value) || 0,
                    }))
                  }
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-right text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-muted-foreground">
                  Tipo
                </label>
                <select
                  value={genLine.kind}
                  onChange={(event) =>
                    setGenLine((current) => ({
                      ...current,
                      kind: event.target.value as "earning" | "deduction",
                    }))
                  }
                  className="h-8 w-full rounded-md border border-input bg-transparent px-1 text-xs"
                >
                  <option value="earning">Devengo</option>
                  <option value="deduction">Deducción</option>
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!genLine.label.trim() || genLine.amount <= 0}
                onClick={async () => {
                  await addPayrollLine(payroll.id, {
                    label: genLine.label.trim(),
                    amount: genLine.amount,
                    kind: genLine.kind,
                    group: genLine.kind === "earning" ? "devengo" : "deduccion",
                  });
                  setGenLine({ label: "", amount: 0, kind: "earning" });
                }}
              >
                Agregar
              </Button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Días trabajados en la quincena
              </label>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={generationForm.days || ""}
                onChange={(event) =>
                  setGenerationForm((current) => ({
                    ...current,
                    days: Number(event.target.value) || 0,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Fecha de liquidación
              </label>
              <input
                type="date"
                value={generationForm.paymentDate}
                onChange={(event) =>
                  setGenerationForm((current) => ({
                    ...current,
                    paymentDate: event.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerationOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={generationBusy || generationForm.days <= 0}
              onClick={async () => {
                if (!editable || generationBusy) return;
                setGenerationBusy(true);
                try {
                  const result = calculatePayroll(
                    employee,
                    currentCompany,
                    [],
                    generationForm.days,
                    payroll.fortnight,
                  );
                  const { data, error } = await supabase
                    .from("payroll_payrolls")
                    .update({
                      lines: result.lines as unknown as never,
                      ibc: result.ibc,
                      days_worked: generationForm.days,
                      payment_date: generationForm.paymentDate,
                    })
                    .eq("id", payroll.id)
                    .in("status", ["borrador", "revisado"])
                    .select("id");
                  if (error) {
                    console.error(error.message);
                    return;
                  }
                  if (!data?.length) {
                    console.error(
                      "No se recalculó: la nómina ya no permite modificaciones."
                    );
                    await refresh();
                    setGenerationOpen(false);
                    return;
                  }
                  await refresh();
                  setGenerationOpen(false);
                } finally {
                  setGenerationBusy(false);
                }
              }}
            >
              {generationBusy ? "Recalculando…" : "Guardar y recalcular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
