import { useState } from "react";
import { toast } from "sonner";
import { Calculator, Check, Save, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateNovelties,
  emptyNovelties,
  monthlyHoursFor,
  type PayrollNovelties,
} from "@/lib/payroll";
import { formatCOP, formatDateLong, formatMonth, fullName } from "@/lib/format";
import {
  defaultPaymentDate,
  workedDaysInFortnight,
} from "@/lib/payroll-periods";
import type { Company, Employee } from "@/data/types";

const hourFields: { key: keyof PayrollNovelties; label: string }[] = [
  { key: "overtimeDayHours", label: "HE diurna" },
  { key: "overtimeNightHours", label: "HE nocturna" },
  { key: "nightHours", label: "Rec. nocturno" },
  { key: "holidayHours", label: "Dominical/festivo" },
];

export const GeneratePayrollDialog = ({
  open,
  onOpenChange,
  company,
  employees,
  period,
  fortnight = 1,
  initialValues,
  initialPaymentDate,
  mode = "new",
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  employees: Employee[];
  period: string;
  fortnight?: 1 | 2;
  initialValues?: Record<string, PayrollNovelties>;
  initialPaymentDate?: string;
  mode?: "new" | "recalculate";
  onGenerate: (
    novelties: Record<string, PayrollNovelties>,
    paymentDate: string,
    employeeId?: string,
  ) => Promise<number>;
}) => {
  const [values, setValues] = useState<Record<string, PayrollNovelties>>(() =>
    Object.fromEntries(
      employees.map((employee) => [
        employee.id,
        { ...emptyNovelties(), ...(initialValues?.[employee.id] ?? {}) },
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const suggestedPaymentDate = defaultPaymentDate(period, fortnight);
  const [paymentDate, setPaymentDate] = useState(
    initialPaymentDate || suggestedPaymentDate,
  );

  const setValue = (
    employeeId: string,
    key: keyof PayrollNovelties,
    value: string,
  ) =>
    setValues((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] ?? emptyNovelties()),
        [key]: Number(value) || 0,
      },
    }));

  const breakdowns = employees.map((employee) => ({
    employee,
    breakdown: calculateNovelties(
      employee,
      company,
      values[employee.id] ?? emptyNovelties(),
    ),
  }));

  const total = breakdowns.reduce(
    (sum, item) => sum + item.breakdown.total,
    0,
  );

  const submit = async () => {
    setBusy(true);
    try {
      const processed = await onGenerate(
        values,
        paymentDate || suggestedPaymentDate,
      );
      if (processed > 0) {
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos generar la nómina. Intenta de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="font-display text-lg">
            {mode === "recalculate" ? "Recalcular borrador" : "Liquidar nómina"} · {formatMonth(period)} · Quincena {fortnight}
          </DialogTitle>
          <DialogDescription>
            Se liquida la quincena {fortnight} (15 días de salario). Registra
            las novedades por colaborador; las horas extra y recargos se
            calculan con el salario y los porcentajes configurados en Ajustes.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[64vh] overflow-y-auto px-6 py-4 scrollbar-slim">
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fecha de liquidación
              </p>
              <Input
                type="date"
                className="mt-1 h-9 w-[170px] bg-card text-xs"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
            </div>
            <p className="pb-2 text-[11px] text-muted-foreground">
              Por defecto el 15 de cada mes. Se usa en el comprobante de pago y
              queda guardada en la nómina del periodo.
            </p>
          </div>
          <p className="mb-2 rounded-lg bg-primary-soft/40 px-3 py-2 text-[11px] text-muted-foreground">
            {mode === "recalculate"
              ? "Se cargaron las novedades del borrador seleccionado. Revisa los valores antes de confirmar."
              : "Se cargaron las novedades de la nómina anterior como referencia. Revísalas antes de generar."}
          </p>
          {employees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Todas las nóminas de este periodo ya están generadas.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                <span>
                  Jornada: {company.params.weeklyHours} h/semana ·{" "}
                  {monthlyHoursFor(company)} h/mes
                </span>
                <span>
                  Valor hora base del salario ÷ {monthlyHoursFor(company)}
                </span>
                <span>
                  Recargos: extra diurna {Math.round(company.params.extraDaySurcharge * 100)}% ·
                  extra nocturna {Math.round(company.params.extraNightSurcharge * 100)}% ·
                  nocturno {Math.round(company.params.nightSurcharge * 100)}% ·
                  dominical {Math.round(company.params.sundayHolidaySurcharge * 100)}%
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[170px]">Empleado</TableHead>
                      <TableHead className="text-center text-[11px]">
                        Días
                        <span className="block font-normal text-muted-foreground">
                          quincena
                        </span>
                      </TableHead>
                      {hourFields.map((field) => (
                        <TableHead key={field.key} className="text-center text-[11px]">
                          {field.label}
                          <span className="block font-normal text-muted-foreground">
                            horas
                          </span>
                        </TableHead>
                      ))}
                      <TableHead className="text-center text-[11px]">
                        Bonificación
                        <span className="block font-normal text-muted-foreground">
                          COP
                        </span>
                      </TableHead>
                      <TableHead className="text-center text-[11px]">
                        Alimentación
                        <span className="block font-normal text-muted-foreground">
                          COP
                        </span>
                      </TableHead>
                      <TableHead className="text-right text-[11px]">
                        Total novedades
                      </TableHead>
                      <TableHead className="text-center text-[11px]">
                        Guardar
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdowns.map(({ employee, breakdown }) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {fullName(employee)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatCOP(breakdown.hourlyRate)}/h ·{" "}
                            {employee.position}
                          </p>
                        </TableCell>
                        <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                          {workedDaysInFortnight(employee, period, fortnight)}
                        </TableCell>
                        {hourFields.map((field) => (
                          <TableCell key={field.key} className="text-center">
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={
                                values[employee.id]?.[field.key] || ""
                              }
                              onChange={(event) =>
                                setValue(employee.id, field.key, event.target.value)
                              }
                              className="mx-auto h-8 w-[70px] text-right text-xs"
                              placeholder="0"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            step={10000}
                            value={values[employee.id]?.bonus || ""}
                            onChange={(event) =>
                              setValue(employee.id, "bonus", event.target.value)
                            }
                            className="mx-auto h-8 w-[110px] text-right text-xs"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={0}
                            step={10000}
                            value={values[employee.id]?.foodAllowance || ""}
                            onChange={(event) =>
                              setValue(
                                employee.id,
                                "foodAllowance",
                                event.target.value,
                              )
                            }
                            className="mx-auto h-8 w-[110px] text-right text-xs"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {formatCOP(breakdown.total)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={savedIds.includes(employee.id) ? "ghost" : "outline"}
                            disabled={
                              busy ||
                              savingId !== null ||
                              savedIds.includes(employee.id)
                            }
                            onClick={async () => {
                              setSavingId(employee.id);
                              try {
                                const processed = await onGenerate(
                                  {
                                    [employee.id]:
                                      values[employee.id] ?? emptyNovelties(),
                                  },
                                  paymentDate || suggestedPaymentDate,
                                  employee.id,
                                );
                                if (processed > 0) {
                                  setSavedIds((current) => [
                                    ...current,
                                    employee.id,
                                  ]);
                                }
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "No pudimos guardar la nómina.",
                                );
                              } finally {
                                setSavingId(null);
                              }
                            }}
                          >
                            {savedIds.includes(employee.id) ? (
                              <>
                                <Check className="size-3.5" /> Guardada
                              </>
                            ) : (
                              <>
                                <Save className="size-3.5" />{" "}
                                {savingId === employee.id
                                  ? "Guardando…"
                                  : mode === "recalculate"
                                    ? "Recalcular"
                                    : "Guardar nómina"}
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-3 flex flex-col gap-2 rounded-xl bg-primary-soft/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calculator className="size-4 text-primary" />
                  {mode === "recalculate"
                    ? "1 borrador seleccionado para recalcular"
                    : `${employees.length} nóminas por generar · novedades del periodo`}
                </p>
                <p className="font-display text-lg font-bold text-foreground">
                  {formatCOP(total)}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={
              busy ||
              savingId !== null ||
              employees.length === 0 ||
              (mode === "recalculate" && savedIds.length > 0)
            }
          >
            <Sparkles className="size-4" />
            {busy
              ? mode === "recalculate" ? "Recalculando…" : "Generando…"
              : mode === "recalculate"
                ? savedIds.length > 0 ? "Borrador recalculado" : "Recalcular borrador"
                : `Generar ${employees.length} ${employees.length === 1 ? "nómina" : "nóminas"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
