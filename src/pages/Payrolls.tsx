import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarRange,
  Calculator,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { PayrollSheet } from "@/components/payroll/payroll-sheet";
import { GeneratePayrollDialog } from "@/components/payroll/generate-payroll-dialog";
import { downloadPayrollSettlementPdf } from "@/lib/payroll-settlement-pdf";
import { nextConsecutive } from "@/lib/consecutive";
import {
  defaultPaymentDate,
  employeeInFortnight,
  payrollSlots,
} from "@/lib/payroll-periods";

import { downloadPayslipPdf } from "@/lib/payslip";
import {
  downloadBancolombiaPab,
  downloadPayrollExcel,
  type PayrollPaymentRow,
} from "@/lib/payroll-files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/context/app-context-value";
import { payrollTotals, type PayrollNovelties } from "@/lib/payroll";
import {
  DOCUMENT_LABELS,
  documentKindForContract,
  hasGeneratedContract,
} from "@/lib/documents";
import {
  formatCOP,
  formatMonth,
  formatMonthShort,
  fullName,
} from "@/lib/format";
import type { Employee, Payroll } from "@/data/types";

export const Payrolls = () => {
  const {
    currentCompany,
    companyEmployees,
    companyDocuments,
    companyPayrolls,
    period,
    setPeriod,
    generatePayroll,
    deletePayroll,
    deletePayrollFortnight,
    payPayrollFortnight,
    updatePayrollFortnightDate,
    setPayrollStatus,
    employeeSignatures,
    periodClosures,
    finalizePayrollPeriod,
    reopenPayrollPeriod,
  } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selected, setSelected] = useState<Payroll | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [recalculateTarget, setRecalculateTarget] = useState<Payroll | null>(null);
  const [fortnight, setFortnight] = useState<1 | 2>(1);
  const [deleteTarget, setDeleteTarget] = useState<Payroll | null>(null);
  const [deleteFortnightOpen, setDeleteFortnightOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payAndFinalize, setPayAndFinalize] = useState(false);
  const [forceGenerate, setForceGenerate] = useState(false);
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [editDate, setEditDate] = useState(`${period}-15`);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const slots = useMemo(() => {
    const list = payrollSlots(2026);
    const key = `${period}|${fortnight}`;
    if (!list.some((slot) => `${slot.period}|${slot.fortnight}` === key)) {
      list.unshift({
        period,
        fortnight,
        label: `${formatMonth(period)} · Quincena ${fortnight}`,
      });
    }
    return list;
  }, [period, fortnight]);

  const currentSlotLabel =
    slots.find(
      (slot) => slot.period === period && slot.fortnight === fortnight,
    )?.label ?? `${formatMonth(period)} ${fortnight}`;

  const periodPayrolls = companyPayrolls.filter(
    (payroll) =>
      payroll.period === period && (payroll.fortnight ?? 1) === fortnight,
  );

  const totals = periodPayrolls.reduce(
    (acc, payroll) => {
      const result = payrollTotals(payroll.lines);
      return {
        gross: acc.gross + result.gross,
        deductions: acc.deductions + result.deductions,
        net: acc.net + result.net,
        totalCost: acc.totalCost + result.totalCost,
      };
    },
    { gross: 0, deductions: 0, net: 0, totalCost: 0 },
  );

  const filtered = periodPayrolls.filter((payroll) => {
    const employee = companyEmployees.find(
      (item) => item.id === payroll.employeeId,
    );
    if (!employee) return false;
    if (statusFilter !== "todos" && payroll.status !== statusFilter)
      return false;
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${employee.firstName} ${employee.lastName} ${employee.docNumber}`
      .toLowerCase()
      .includes(term);
  });

  const eligibleFor = (slotFortnight: 1 | 2) =>
    companyEmployees.filter(
      (employee) =>
        (employee.status === "activo" ||
          (employee.status === "retirado" && Boolean(employee.endDate))) &&
        employeeInFortnight(employee, period, slotFortnight),
    );

  const activeEmployees = eligibleFor(fortnight);
  const missingEmployees = activeEmployees.filter(
    (employee) =>
      !periodPayrolls.some(
        (payroll) => payroll.employeeId === employee.id,
      ),
  );
  const periodAllPayrolls = companyPayrolls.filter(
    (payroll) => payroll.period === period,
  );
  // El mes solo se puede finalizar cuando las dos quincenas están pagadas.
  const monthComplete = ([1, 2] as const).every((slotFortnight) => {
    const eligible = eligibleFor(slotFortnight);
    const rows = periodAllPayrolls.filter(
      (payroll) => (payroll.fortnight ?? 1) === slotFortnight,
    );
    return (
      eligible.length > 0 &&
      eligible.every((employee) =>
        rows.some(
          (payroll) =>
            payroll.employeeId === employee.id &&
            payroll.status === "pagado",
        ),
      )
    );
  });

  const pendingContractEmployees = missingEmployees.filter(
    (employee) => !hasGeneratedContract(employee, companyDocuments),
  );
  // Copia las novedades de la última nómina del empleado como borrador.
  const initialNovelties = useMemo(() => {
    const map: Record<string, PayrollNovelties> = {};
    missingEmployees.forEach((employee) => {
      const previous = companyPayrolls
        .filter((payroll) => payroll.employeeId === employee.id)
        .sort((a, b) =>
          `${a.period}-${a.fortnight}`.localeCompare(
            `${b.period}-${b.fortnight}`,
          ),
        )
        .pop();
      if (!previous) return;

      const stored =
        previous.novelties && Object.keys(previous.novelties).length > 0
          ? (previous.novelties as unknown as PayrollNovelties)
          : null;
      if (stored) {
        map[employee.id] = stored;
        return;
      }

      // Si la nómina anterior no guardó novedades, se toman los valores extras
      // de sus devengos (bonificación y alimentación).
      const amountOf = (term: string) =>
        previous.lines.find(
          (line) =>
            line.kind === "earning" &&
            line.label.toLowerCase().includes(term),
        )?.amount ?? 0;
      map[employee.id] = {
        overtimeDayHours: 0,
        overtimeNightHours: 0,
        nightHours: 0,
        holidayHours: 0,
        bonus: amountOf("bonificaci"),
        foodAllowance: amountOf("alimentaci"),
      };
    });
    return map;
  }, [missingEmployees, companyPayrolls]);

  // Conceptos extra (horas, bonos, préstamos) de la nómina anterior.
  const carriedExtras = useMemo(() => {
    const skip = ["salario", "auxilio", "incapacidad", "bonificaci", "alimentaci"];
    const map: Record<string, { label: string; amount: number }[]> = {};
    missingEmployees.forEach((employee) => {
      const previous = companyPayrolls
        .filter((payroll) => payroll.employeeId === employee.id)
        .sort((a, b) =>
          `${a.period}-${a.fortnight}`.localeCompare(
            `${b.period}-${b.fortnight}`,
          ),
        )
        .pop();
      if (!previous) return;
      // Si la nómina anterior guardó novedades, esas ya reconstruyen los
      // conceptos variables; se evita duplicarlos.
      if (
        previous.novelties &&
        Object.keys(previous.novelties).length > 0
      ) {
        return;
      }
      const extras = previous.lines
        .filter(
          (line) =>
            line.kind === "earning" &&
            line.amount > 0 &&
            !skip.some((term) => line.label.toLowerCase().includes(term)),
        )
        .map((line) => ({ label: line.label, amount: line.amount }));
      if (extras.length > 0) map[employee.id] = extras;
    });
    return map;
  }, [missingEmployees, companyPayrolls]);

  const missing = missingEmployees.length;
  const periodFinal = Boolean(
    currentCompany &&
      periodClosures.some(
        (closure) =>
          closure.companyId === currentCompany.id &&
          closure.period === period,
      ),
  );
  const paymentRows: PayrollPaymentRow[] = periodPayrolls
    .map((payroll) => {
      const employee = companyEmployees.find(
        (item) => item.id === payroll.employeeId,
      );
      return employee ? { payroll, employee } : null;
    })
    .filter((row): row is PayrollPaymentRow => Boolean(row));

  const handleExcelDownload = async () => {
    if (!currentCompany || paymentRows.length === 0) return;
    try {
      await downloadPayrollExcel(paymentRows, currentCompany, period);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos generar el Excel.",
      );
    }
  };

  const handlePayslipDownload = async (
    payroll: Payroll,
    employee: Employee,
  ) => {
    if (!currentCompany) return;
    const consecutive = await nextConsecutive(
      currentCompany.id,
      "comprobante-nomina",
    );
    await downloadPayslipPdf(
      payroll,
      { ...employee, signatureData: employeeSignatures[employee.id] },
      currentCompany,
      consecutive,
    );
  };

  const handleDraftPayslips = async () => {
    if (!currentCompany || paymentRows.length === 0) return;
    toast.info(
      `Generando ${paymentRows.length} volantes. Si el navegador pregunta, permite las descargas múltiples.`,
    );
    for (const { payroll, employee } of paymentRows) {
      const consecutive = await nextConsecutive(
        currentCompany.id,
        "comprobante-nomina",
      );
      await downloadPayslipPdf(
        payroll,
        { ...employee, signatureData: employeeSignatures[employee.id] },
        currentCompany,
        consecutive,
      );
    }
  };

  const handleSettlementReceipt = async () => {
    if (!currentCompany || paymentRows.length === 0) return;
    const paymentDate =
      periodPayrolls.find((payroll) => payroll.paymentDate)?.paymentDate ??
      defaultPaymentDate(period, fortnight);
    const consecutive = await nextConsecutive(
      currentCompany.id,
      "liquidacion-nomina",
    );
    await downloadPayrollSettlementPdf(
      paymentRows,
      currentCompany,
      { period, fortnight, paymentDate },
      consecutive,
      periodPayrolls.some((payroll) => payroll.status !== "pagado"),
    );
  };

  const handlePabDownload = async () => {
    if (!currentCompany || paymentRows.length === 0) return;
    try {
      const liquidationDate = periodPayrolls.find(
        (payroll) => payroll.paymentDate,
      )?.paymentDate;
      const result = await downloadBancolombiaPab(
        paymentRows,
        currentCompany,
        period,
        new Date(`${liquidationDate ?? `${period}-15`}T12:00:00`),
      );
      toast.success(
        `Archivo plano generado con ${result.included} pagos por ${formatCOP(result.total)}.`,
      );
      if (result.skipped.length > 0) {
        toast.warning(
          `${result.skipped.length} empleados no se incluyeron: ${result.skipped
            .map((item) => `${item.employee.firstName} ${item.employee.lastName}`)
            .join(", ")}.`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos generar el archivo plano.",
      );
    }
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany?.name}
        title="Nóminas"
        description="Liquida el periodo, revisa cada recibo y ciérralo cuando el pago esté confirmado."
        actions={
          <>
            <Select
              value={`${period}|${fortnight}`}
              onValueChange={(value) => {
                const [nextPeriod, nextFortnight] = value.split("|");
                setPeriod(nextPeriod);
                setFortnight(nextFortnight === "2" ? 2 : 1);
              }}
            >
              <SelectTrigger className="w-[230px] bg-card capitalize">
                <CalendarRange className="mr-1 size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem
                    key={`${slot.period}|${slot.fortnight}`}
                    value={`${slot.period}|${slot.fortnight}`}
                    className="capitalize"
                  >
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {periodFinal ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => void handleSettlementReceipt()}
                >
                  <FileText className="size-4" /> Comprobante
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleExcelDownload()}
                >
                  <FileSpreadsheet className="size-4" /> Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handlePabDownload()}
                >
                  <FileText className="size-4" /> Archivo plano
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void reopenPayrollPeriod(period)}
                >
                  <Lock className="size-4" /> Reabrir periodo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={
                    periodPayrolls.length === 0 ||
                    periodPayrolls.every(
                      (payroll) => payroll.status === "pagado",
                    )
                  }
                  onClick={() => {
                    setPayAndFinalize(monthComplete && !periodFinal);
                    setPayOpen(true);
                  }}
                  title={
                    periodPayrolls.length > 0 &&
                    periodPayrolls.every(
                      (payroll) => payroll.status === "pagado",
                    )
                      ? "Esta quincena ya está pagada"
                      : undefined
                  }
                >
                  <CheckCircle2 className="size-4" />{" "}
                  {periodPayrolls.length > 0 &&
                  periodPayrolls.every(
                    (payroll) => payroll.status === "pagado",
                  )
                    ? "Quincena pagada"
                    : "Pagar quincena"}
                </Button>
                <Button
                  variant="outline"
                  disabled={periodPayrolls.length === 0}
                  onClick={() => void handleSettlementReceipt()}
                >
                  <FileText className="size-4" />{" "}
                  {periodPayrolls.some(
                    (payroll) => payroll.status !== "pagado",
                  )
                    ? "Plantilla borrador"
                    : "Comprobante"}
                </Button>
                <Button
                  variant="outline"
                  disabled={periodPayrolls.length === 0}
                  onClick={() => void handleExcelDownload()}
                >
                  <FileSpreadsheet className="size-4" /> Excel
                </Button>
                <Button
                  variant="outline"
                  disabled={periodPayrolls.length === 0}
                  onClick={() => void handlePabDownload()}
                >
                  <FileText className="size-4" /> Archivo plano
                </Button>
                <Button
                  variant="outline"
                  disabled={periodPayrolls.length === 0}
                  onClick={() => void handleDraftPayslips()}
                >
                  <FileSpreadsheet className="size-4" /> Volantes
                </Button>
                <Button
                  variant="outline"
                  disabled={periodPayrolls.length === 0}
                  onClick={() => {
                    setEditDate(
                      periodPayrolls.find((payroll) => payroll.paymentDate)
                        ?.paymentDate ??
                        defaultPaymentDate(period, fortnight),
                    );
                    setEditDateOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Editar fecha
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={periodPayrolls.length === 0}
                  onClick={() => setDeleteFortnightOpen(true)}
                >
                  <Trash2 className="size-4" /> Eliminar{" "}
                  <span className="capitalize">{currentSlotLabel}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setForceGenerate(false);
                    setGenerateOpen(true);
                  }}
                  disabled={
                    pendingContractEmployees.length > 0 ||
                    missing === 0
                  }
                  title={
                    pendingContractEmployees.length > 0
                      ? "Genera el contrato de todos los colaboradores antes de liquidar"
                      : undefined
                  }
                >
                  <Sparkles className="size-4" /> Generar nómina
                </Button>
                <Button
                  onClick={() => setFinalizeOpen(true)}
                  disabled={
                    periodPayrolls.length === 0 ||
                    missing > 0 ||
                    !monthComplete
                  }
                  title={
                    !monthComplete
                      ? "Genera y paga las dos quincenas del mes antes de finalizar"
                      : undefined
                  }
                >
                  <Lock className="size-4" /> Finalizar mes
                </Button>
              </>
            )}
          </>
        }
      />

      {currentCompany &&
      currentCompany.params.year < new Date().getFullYear() ? (
        <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning-soft/40 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            Los parámetros de nómina son de{" "}
            <strong className="text-foreground">
              {currentCompany.params.year}
            </strong>
            . Actualiza SMLMV, auxilio y UVT a {new Date().getFullYear()} antes
            de liquidar.
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link to="/ajustes">Actualizar parámetros</Link>
          </Button>
        </div>
      ) : null}

      {currentCompany &&
      currentCompany.params.year < new Date().getFullYear() ? (
        <div className="flex flex-col gap-2 rounded-xl border border-warning/30 bg-warning-soft/40 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">
            Los parámetros de nómina son de{" "}
            <strong className="text-foreground">
              {currentCompany.params.year}
            </strong>
            . Actualiza SMLMV, auxilio y UVT a {new Date().getFullYear()} antes
            de liquidar.
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link to="/ajustes">Actualizar parámetros</Link>
          </Button>
        </div>
      ) : null}

      {periodFinal ? (
        <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          <Lock className="size-4" />
          Nómina finalizada. Descarga el Excel o el archivo plano PAB de
          Bancolombia; para modificarla, reabre el periodo.
        </div>
      ) : null}

      {!periodFinal && pendingContractEmployees.length > 0 ? (
        <Card className="border-warning/30 bg-warning-soft/40">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Contratos pendientes · no se puede liquidar la nómina
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Todos los colaboradores activos deben tener su contrato generado
              antes de liquidar el periodo.
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="text-warning"
              onClick={() => {
                setForceGenerate(true);
                setGenerateOpen(true);
              }}
            >
              Generar de todos modos
            </Button>
            {pendingContractEmployees.map((employee) => {
              const kind = documentKindForContract(employee.contractType);
              return (
                <div
                  key={employee.id}
                  className="flex flex-col gap-2 rounded-lg border border-warning/20 bg-card px-3 py-2 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {fullName(employee)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {DOCUMENT_LABELS[kind]} · {employee.position}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      to={`/documentos?empleado=${employee.id}&plantilla=${kind}`}
                    >
                      <FileText className="size-3.5" /> Generar contrato
                    </Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recibos del periodo"
          value={`${periodPayrolls.length}`}
          hint={
            missing > 0
              ? `${missing} empleados sin liquidar`
              : "Toda la plantilla liquidada"
          }
          icon={Wallet}
        />
        <StatCard
          label="Total devengado"
          value={formatCOP(totals.gross)}
          icon={Download}
          tone="success"
        />
        <StatCard
          label="Deducciones"
          value={formatCOP(totals.deductions)}
          hint="Salud, pensión, retención y descuentos"
          icon={CalendarRange}
          tone="warning"
        />
        <StatCard
          label="Neto a pagar"
          value={formatCOP(totals.net)}
          hint={`Coste total ${formatCOP(totals.totalCost)}`}
          icon={Sparkles}
          tone="info"
        />
      </div>

      <Card className="surface-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar empleado"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="revisado">Revisado</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 hidden rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right">Devengos</TableHead>
                  <TableHead className="text-right">Deducciones</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Coste empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-32 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((payroll) => {
                  const employee = companyEmployees.find(
                    (item) => item.id === payroll.employeeId,
                  );
                  if (!employee) return null;
                  const result = payrollTotals(payroll.lines);
                  return (
                    <TableRow
                      key={payroll.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(payroll)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar
                            firstName={employee.firstName}
                            lastName={employee.lastName}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {fullName(employee)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {employee.position}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCOP(result.gross)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-destructive">
                        − {formatCOP(result.deductions)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatCOP(result.net)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatCOP(result.totalCost)}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={payroll.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          {payroll.status !== "pagado" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-success"
                              title="Marcar como pagada"
                              disabled={periodFinal}
                              onClick={(event) => {
                                event.stopPropagation();
                                void setPayrollStatus(payroll.id, "pagado");
                              }}
                            >
                              <CheckCircle2 className="size-3.5" />
                            </Button>
                          ) : null}
                          {payroll.status === "borrador" && !periodFinal ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-primary"
                              title="Recalcular borrador"
                              aria-label="Recalcular borrador"
                              onClick={(event) => {
                                event.stopPropagation();
                                const confirmed = window.confirm(
                                  "¿Deseas recalcular este borrador? Se actualizarán sus valores según el salario, las novedades y las ausencias registradas. Los conceptos manuales no incluidos en el cálculo podrían perderse."
                                );
                                if (!confirmed) return;
                                setGenerateOpen(false);
                                setRecalculateTarget(payroll);
                              }}
                            >
                              <Calculator className="size-3.5" />
                            </Button>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground"
                            title="Editar nómina"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelected(payroll);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground"
                            title="Descargar comprobante"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handlePayslipDownload(payroll, employee);
                            }}
                          >
                            <Download className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            title={
                              periodFinal
                                ? "Reabre el periodo para eliminar nóminas"
                                : "Eliminar nómina"
                            }
                            disabled={periodFinal}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(payroll);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Wallet}
                  title={`Sin nóminas en ${formatMonthShort(period)}`}
                  description="Genera la nómina del periodo para liquidar a toda la plantilla activa."
                  action={
                    <Button size="sm" onClick={() => setGenerateOpen(true)}>
                      <Sparkles className="size-3.5" /> Generar nómina
                    </Button>
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-2 lg:hidden">
            {filtered.map((payroll) => {
              const employee = companyEmployees.find(
                (item) => item.id === payroll.employeeId,
              );
              if (!employee) return null;
              const result = payrollTotals(payroll.lines);
              return (
                <div
                  key={payroll.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-2"
                >
                  <button
                    type="button"
                    onClick={() => setSelected(payroll)}
                    className="flex min-w-0 flex-1 items-center gap-3 p-1 text-left"
                  >
                    <EmployeeAvatar
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {fullName(employee)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Neto {formatCOP(result.net)}
                      </p>
                    </div>
                    <StatusPill status={payroll.status} />
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground"
                      onClick={() => setSelected(payroll)}
                      aria-label="Editar nómina"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground"
                      onClick={() =>
                        void handlePayslipDownload(payroll, employee)
                      }
                      aria-label="Descargar comprobante"
                    >
                      <Download className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={periodFinal}
                      onClick={() => setDeleteTarget(payroll)}
                      aria-label="Eliminar nómina"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Sin nóminas"
                description="Genera la nómina del periodo seleccionado."
                action={
                  <Button size="sm" onClick={() => setGenerateOpen(true)}>
                    Generar nómina
                  </Button>
                }
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <PayrollSheet
        payroll={
          selected
            ? companyPayrolls.find((item) => item.id === selected.id) ?? null
            : null
        }
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        locked={periodFinal}
        onDelete={async (payrollId) => {
          await deletePayroll(payrollId);
          setSelected(null);
        }}
      />

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Pagar la nómina de{" "}
              <span className="capitalize">{currentSlotLabel}</span>
            </DialogTitle>
            <DialogDescription>
              Se marcarán {periodPayrolls.length} recibos como pagados. Los
              colaboradores podrán ver y descargar su comprobante en el portal.
            </DialogDescription>
          </DialogHeader>
          {monthComplete && !periodFinal ? (
            <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              <Checkbox
                checked={payAndFinalize}
                onCheckedChange={(value) => setPayAndFinalize(Boolean(value))}
              />
              <span>
                <span className="font-medium text-foreground">
                  Finalizar la nómina del mes al confirmar
                </span>
                <br />
                Cierra {formatMonth(period)} (las dos quincenas) y bloquea la
                edición; después puedes descargar Excel y archivo plano.
              </span>
            </label>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const paymentSucceeded = await payPayrollFortnight(
                  period,
                  fortnight,
                  periodPayrolls.map((payroll) => payroll.id),
                );

                if (!paymentSucceeded) {
                  return;
                }

                if (payAndFinalize && monthComplete) {
                  await finalizePayrollPeriod(period);
                }

                setPayOpen(false);
              }}
            >
              <CheckCircle2 className="size-4" />{" "}
              {payAndFinalize && monthComplete && !periodFinal
                ? "Pagar y finalizar"
                : "Confirmar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDateOpen} onOpenChange={setEditDateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Editar fecha de liquidación
            </DialogTitle>
            <DialogDescription>
              Se actualizará la fecha de los {periodPayrolls.length} recibos de{" "}
              <span className="capitalize">{currentSlotLabel}</span>. Los
              comprobantes mostrarán la nueva fecha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Fecha de liquidación
            </label>
            <Input
              type="date"
              value={editDate}
              onChange={(event) => setEditDate(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!editDate}
              onClick={async () => {
                await updatePayrollFortnightDate(
                  period,
                  fortnight,
                  editDate,
                  periodPayrolls.map((payroll) => payroll.id),
                );
                setEditDateOpen(false);
              }}
            >
              Guardar fecha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteFortnightOpen}
        onOpenChange={setDeleteFortnightOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              ¿Eliminar la liquidación de{" "}
              <span className="capitalize">{currentSlotLabel}</span>?
            </DialogTitle>
            <DialogDescription>
              Se eliminarán los {periodPayrolls.length} recibos de{" "}
              <span className="capitalize">{currentSlotLabel}</span>. Después
              podrás generar la liquidación de nuevo. Los comprobantes ya
              descargados no se modifican.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFortnightOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deletePayrollFortnight(
                  period,
                  fortnight,
                  periodPayrolls.map((payroll) => payroll.id),
                );
                setDeleteFortnightOpen(false);
                setSelected(null);
              }}
            >
              <Trash2 className="size-4" /> Eliminar liquidación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Eliminar nómina
            </DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Se borrará la nómina de ${
                    companyEmployees.find(
                      (item) => item.id === deleteTarget.employeeId,
                    )
                      ? fullName(
                          companyEmployees.find(
                            (item) => item.id === deleteTarget.employeeId,
                          )!,
                        )
                      : "el colaborador"
                  } (quincena ${deleteTarget.fortnight}) en estado ${deleteTarget.status}. Después podrás generarla de nuevo.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                await deletePayroll(deleteTarget.id);
                setDeleteTarget(null);
                setSelected(null);
              }}
            >
              <Trash2 className="size-4" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Finalizar nómina
            </DialogTitle>
            <DialogDescription>
              Se cerrará la nómina de {formatMonth(period)} (las dos quincenas)
              con {periodAllPayrolls.length} recibos. Después podrás descargar el
              Excel y el archivo plano PAB; la edición quedará bloqueada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                await finalizePayrollPeriod(period);
                setFinalizeOpen(false);
              }}
            >
              <Lock className="size-4" /> Finalizar nómina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(generateOpen || recalculateTarget) && currentCompany ? (
        <GeneratePayrollDialog
          key={recalculateTarget?.id ?? `${period}-${fortnight}-new`}
          open
          company={currentCompany}
          mode={recalculateTarget ? "recalculate" : "new"}
          initialValues={
            recalculateTarget
              ? {
                  [recalculateTarget.employeeId]:
                    recalculateTarget.novelties as unknown as PayrollNovelties,
                }
              : initialNovelties
          }
          initialPaymentDate={recalculateTarget?.paymentDate ?? undefined}
          employees={
            recalculateTarget
              ? companyEmployees.filter(
                  (employee) =>
                    employee.id === recalculateTarget.employeeId,
                )
              : missingEmployees
          }
          period={period}
          fortnight={fortnight}
          onOpenChange={(open) => {
            if (!open) {
              setGenerateOpen(false);
              setRecalculateTarget(null);
            }
          }}
          onGenerate={async (novelties, paymentDate, employeeId) => {
            if (recalculateTarget) {
              if (
                periodFinal ||
                recalculateTarget.status !== "borrador" ||
                recalculateTarget.period !== period ||
                recalculateTarget.fortnight !== fortnight
              ) {
                toast.error("Este borrador ya no está disponible para recalcular.");
                return 0;
              }
            }

            return await generatePayroll(
              period,
              novelties,
              paymentDate,
              fortnight,
              recalculateTarget?.employeeId ?? employeeId,
              recalculateTarget ? false : forceGenerate,
              recalculateTarget ? undefined : carriedExtras,
              recalculateTarget ? "recalculate" : "new",
            );
          }}
        />
      ) : null}
    </div>
  );
};
