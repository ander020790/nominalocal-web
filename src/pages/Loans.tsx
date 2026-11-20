import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  HandCoins,
  Loader2,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { Pill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { useApp } from "@/context/app-context-value";
import { supabase } from "@/integrations/supabase/client";
import { nextConsecutive } from "@/lib/consecutive";
import { formatCOP, formatDate, formatMonth, fullName } from "@/lib/format";
import { downloadLoanPdf, loanQuota } from "@/lib/loan-pdf";
import { mapLoanRow } from "@/lib/loans";
import type { EmployeeLoan, LoanStatus } from "@/data/types";

const statusTone: Record<LoanStatus, "warning" | "success" | "danger" | "neutral"> = {
  solicitado: "warning",
  aprobado: "success",
  rechazado: "danger",
  pagado: "neutral",
};

const statusLabel: Record<LoanStatus, string> = {
  solicitado: "Solicitado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  pagado: "Pagado",
};

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export const Loans = () => {
  const { currentCompany, companyEmployees, session } = useApp();
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    amount: 0,
    installments: 6,
    startPeriod: currentPeriod(),
    reason: "",
  });

  const activeEmployees = useMemo(
    () => companyEmployees.filter((employee) => employee.status === "activo"),
    [companyEmployees],
  );

  const load = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll_loans")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("requested_at", { ascending: false });
    if (error) {
      toast.error("No pudimos cargar los préstamos.");
    } else {
      setLoans((data ?? []).map(mapLoanRow));
    }
    setLoading(false);
  }, [currentCompany]);

  useEffect(() => {
    void load();
  }, [load]);

  const employeeOf = (loan: EmployeeLoan) =>
    companyEmployees.find((employee) => employee.id === loan.employeeId) ??
    null;

  const pending = loans.filter((loan) => loan.status === "solicitado");
  const approved = loans.filter((loan) => loan.status === "aprobado");
  const monthlyQuota = approved.reduce(
    (total, loan) => total + loanQuota(loan),
    0,
  );

  const createLoan = async () => {
    if (!currentCompany) return;
    if (!form.employeeId || form.amount <= 0) {
      toast.error("Selecciona el colaborador e indica el monto.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("payroll_loans").insert({
      company_id: currentCompany.id,
      employee_id: form.employeeId,
      amount: form.amount,
      installments: Math.max(1, Math.min(60, form.installments)),
      reason: form.reason.trim(),
      start_period: form.startPeriod,
      status: "aprobado",
      requested_by: session?.userId,
      reviewed_by: session?.userId,
      reviewed_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("No pudimos registrar el préstamo.");
      return;
    }
    setOpen(false);
    setForm({
      employeeId: "",
      amount: 0,
      installments: 6,
      startPeriod: currentPeriod(),
      reason: "",
    });
    toast.success("Préstamo registrado.");
    void load();
  };

  const changeStatus = async (loan: EmployeeLoan, status: LoanStatus) => {
    const { error } = await supabase
      .from("payroll_loans")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session?.userId,
      })
      .eq("id", loan.id);
    if (error) {
      toast.error("No pudimos actualizar la solicitud.");
      return;
    }
    toast.success(
      status === "aprobado" ? "Solicitud aprobada." : "Solicitud rechazada.",
    );
    void load();
  };

  const download = async (loan: EmployeeLoan) => {
    if (!currentCompany) return;
    const employee = employeeOf(loan);
    if (!employee) return;
    const consecutive = await nextConsecutive(currentCompany.id, "prestamo");
    await downloadLoanPdf(loan, employee, currentCompany, consecutive);
  };

  if (!currentCompany) return null;

  const formEmployee = activeEmployees.find(
    (employee) => employee.id === form.employeeId,
  );
  const quotaPreview = form.amount > 0
    ? Math.round(form.amount / Math.max(1, form.installments))
    : 0;

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany.name}
        title="Préstamos y descuentos"
        description="Registra préstamos a colaboradores, aprueba las solicitudes y genera el formato de solicitud con autorización de descuento de nómina."
        actions={
          <Button
            onClick={() => {
              setForm({
                employeeId: activeEmployees[0]?.id ?? "",
                amount: 0,
                installments: 6,
                startPeriod: currentPeriod(),
                reason: "",
              });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Nuevo préstamo
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="surface-card border-0">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Solicitudes pendientes
              </p>
              <p className="font-display text-2xl font-bold">{pending.length}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-warning-soft text-warning">
              <HandCoins className="size-4" />
            </span>
          </CardContent>
        </Card>
        <Card className="surface-card border-0">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Préstamos aprobados
              </p>
              <p className="font-display text-2xl font-bold">
                {approved.length}
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Wallet className="size-4" />
            </span>
          </CardContent>
        </Card>
        <Card className="surface-card border-0">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Descuento mensual
              </p>
              <p className="font-display text-lg font-bold">
                {formatCOP(monthlyQuota)}
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-success">
              <Download className="size-4" />
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <HandCoins className="size-4 text-primary" /> Solicitudes y
            préstamos
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            El colaborador puede solicitar el préstamo desde su portal; la
            empresa aprueba y descarga el formato firmable.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Cargando préstamos…
            </p>
          ) : loans.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="Sin préstamos registrados"
              description="Registra un préstamo o espera la solicitud del colaborador desde su portal."
            />
          ) : (
            loans.map((loan) => {
              const employee = employeeOf(loan);
              return (
                <div
                  key={loan.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  {employee ? (
                    <EmployeeAvatar
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {employee ? fullName(employee) : "Colaborador"}
                      </p>
                      <Pill tone={statusTone[loan.status]}>
                        {statusLabel[loan.status]}
                      </Pill>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCOP(loan.amount)} · {loan.installments}{" "}
                      {loan.installments === 1 ? "cuota" : "cuotas"} de{" "}
                      {formatCOP(loanQuota(loan))} · Inicio{" "}
                      {loan.startPeriod
                        ? formatMonth(loan.startPeriod)
                        : "siguiente nómina"}{" "}
                      · Solicitado {formatDate(loan.requestedAt.slice(0, 10))}
                    </p>
                    {loan.reason ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {loan.reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {loan.status === "solicitado" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void changeStatus(loan, "aprobado")}
                        >
                          <Check className="size-3.5" /> Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void changeStatus(loan, "rechazado")}
                        >
                          <X className="size-3.5" /> Rechazar
                        </Button>
                      </>
                    ) : null}
                    {loan.status !== "rechazado" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void download(loan)}
                      >
                        <Download className="size-3.5" /> Formato PDF
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Registrar préstamo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Colaborador
              </Label>
              <Select
                value={form.employeeId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, employeeId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {fullName(employee)} · {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Monto del préstamo
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={50000}
                  value={form.amount || ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: Number(event.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Número de cuotas
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={form.installments || ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      installments: Number(event.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Cuota mensual estimada:{" "}
              <span className="font-semibold text-foreground">
                {formatCOP(quotaPreview)}
              </span>
              {formEmployee
                ? ` · ${Math.round(
                    (quotaPreview / Math.max(1, formEmployee.salary)) * 100,
                  )}% del salario`
                : ""}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Periodo del primer descuento
                </Label>
                <Input
                  type="month"
                  value={form.startPeriod}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startPeriod: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Motivo
                </Label>
                <Input
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void createLoan()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar préstamo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
