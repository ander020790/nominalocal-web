import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  Download,
  Eye,
  FileSignature,
  HandCoins,
  Loader2,
  Palmtree,
  Pencil,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Pill, StatusPill } from "@/components/common/status-pill";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { DocumentPaper } from "@/components/documents/document-paper";
import { SignaturePad } from "@/components/common/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/context/app-context-value";
import {
  monthlyCompensation,
  payrollTotals,
  transportAllowanceFor,
} from "@/lib/payroll";
import { downloadPayslipPdf } from "@/lib/payslip";
import { downloadLaborCertificate } from "@/lib/labor-certificate";
import { nextConsecutive } from "@/lib/consecutive";
import {
  buildDocument,
  DOCUMENT_LABELS,
  downloadDocumentPdf,
} from "@/lib/documents";
import { daysBetween, formatCOP, formatDate, formatMonth } from "@/lib/format";
import { downloadLoanPdf, loanQuota } from "@/lib/loan-pdf";
import { mapLoanRow } from "@/lib/loans";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  Absence,
  EmployeeLoan,
  GeneratedDocumentRecord,
} from "@/data/types";

const tabs = [
  { to: "/portal", label: "Resumen" },
  { to: "/portal/nomina", label: "Mis recibos" },
  { to: "/portal/documentos", label: "Mis documentos" },
  { to: "/portal/vacaciones", label: "Vacaciones" },
  { to: "/portal/permisos", label: "Permisos" },
  { to: "/portal/prestamos", label: "Préstamos" },
];

export const Portal = () => {
  const {
    session,
    currentEmployee,
    currentCompany,
    companyPayrolls,
    companyDocuments,
    companyAbsences,
    addAbsence,
    updateAbsence,
    deleteAbsence,
    employeeSignatures,
    saveEmployeeSignature,
    dataLoading,
  } = useApp();
  const location = useLocation();
  const [viewing, setViewing] = useState<GeneratedDocumentRecord | null>(null);
  const [vacation, setVacation] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [absenceForm, setAbsenceForm] = useState({
    type: "permiso" as Absence["type"],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [leave, setLeave] = useState({
    type: "permiso" as "permiso" | "licencia" | "incapacidad",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [loansKey, setLoansKey] = useState(0);
  const [loanOpen, setLoanOpen] = useState(false);
  const [loanSaving, setLoanSaving] = useState(false);
  const [loanForm, setLoanForm] = useState({
    amount: 0,
    installments: 6,
    reason: "",
  });

  const employeeId = currentEmployee?.id;

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("payroll_loans")
        .select("*")
        .eq("employee_id", employeeId)
        .order("requested_at", { ascending: false });
      if (active) setLoans((data ?? []).map(mapLoanRow));
    })();
    return () => {
      active = false;
    };
  }, [employeeId, loansKey]);

  if (!currentEmployee || !currentCompany) {
    if (dataLoading) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando tu portal…
          </div>
        </div>
      );
    }
    return (
      <EmptyState
        icon={Wallet}
        title="Portal no disponible"
        description="Tu usuario no está vinculado a una ficha de empleado. Contacta al área de RRHH de tu empresa."
      />
    );
  }

  const payrolls = companyPayrolls
    .filter((payroll) => payroll.employeeId === currentEmployee.id)
    .sort((a, b) => b.period.localeCompare(a.period));
  const documents = companyDocuments.filter(
    (document) => document.employeeId === currentEmployee.id,
  );
  const absences = companyAbsences.filter(
    (absence) => absence.employeeId === currentEmployee.id,
  );
  const paidPayrolls = payrolls.filter((payroll) => payroll.status === "pagado");
  const lastPaid = paidPayrolls[0];
  const current = payrolls[0];
  const vacationDays = absences
    .filter((absence) => absence.type === "vacaciones")
    .reduce((sum, absence) => sum + absence.days, 0);

  const signedEmployee = {
    ...currentEmployee,
    signatureData: employeeSignatures[currentEmployee.id],
  };

  const viewingContent =
    viewing && currentCompany
      ? buildDocument(viewing.kind, signedEmployee, currentCompany)
      : null;

  const section = location.pathname;

  const requestLoan = async () => {
    if (!currentCompany || !currentEmployee) return;
    if (loanForm.amount <= 0) {
      toast.error("Indica el monto que necesitas.");
      return;
    }
    setLoanSaving(true);
    const { error } = await supabase.from("payroll_loans").insert({
      company_id: currentCompany.id,
      employee_id: currentEmployee.id,
      amount: loanForm.amount,
      installments: Math.max(1, Math.min(60, loanForm.installments)),
      reason: loanForm.reason.trim(),
      start_period: new Date().toISOString().slice(0, 7),
      status: "solicitado",
      requested_by: session?.userId,
    });
    setLoanSaving(false);
    if (error) {
      toast.error("No pudimos enviar la solicitud.");
      return;
    }
    toast.success("Solicitud enviada a Recursos Humanos.");
    setLoanOpen(false);
    setLoanForm({ amount: 0, installments: 6, reason: "" });
    setLoansKey((key) => key + 1);
  };

  const downloadLoan = async (loan: EmployeeLoan) => {
    const consecutive = await nextConsecutive(currentCompany.id, "prestamo");
    await downloadLoanPdf(loan, currentEmployee, currentCompany, consecutive);
  };

  const requestVacation = async () => {
    await addAbsence({
      employeeId: currentEmployee.id,
      type: "vacaciones",
      startDate: vacation.startDate,
      endDate: vacation.endDate,
      days: daysBetween(vacation.startDate, vacation.endDate),
      notes: vacation.notes,
      status: "pendiente",
    });
    setVacation((value) => ({ ...value, notes: "" }));
  };

  const openAbsenceEditor = (absence: Absence) => {
    setAbsenceForm({
      type: absence.type,
      startDate: absence.startDate,
      endDate: absence.endDate,
      notes: absence.notes ?? "",
    });
    setEditingAbsence(absence);
  };

  const saveAbsence = async () => {
    if (!editingAbsence) return;
    await updateAbsence(editingAbsence.id, {
      type: absenceForm.type,
      startDate: absenceForm.startDate,
      endDate: absenceForm.endDate,
      days: daysBetween(absenceForm.startDate, absenceForm.endDate),
      notes: absenceForm.notes,
    });
    setEditingAbsence(null);
  };

  const requestLeave = async () => {
    await addAbsence({
      employeeId: currentEmployee.id,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days: daysBetween(leave.startDate, leave.endDate),
      notes: leave.notes,
      status: "pendiente",
    });
    setLeave((value) => ({ ...value, notes: "" }));
  };

  const absenceActions = (absence: Absence) =>
    absence.status === "pendiente" ? (
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground"
          onClick={() => openAbsenceEditor(absence)}
          aria-label="Editar solicitud"
        >
          <Pencil className="size-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-destructive"
              aria-label="Eliminar solicitud"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar la solicitud?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borrará tu solicitud de {absence.type} ({absence.days} días).
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => void deleteAbsence(absence.id)}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    ) : null;

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany.name}
        title={`Hola, ${currentEmployee.firstName}`}
        description={`${currentEmployee.position} · ${currentCompany.pointsOfSale.find((pos) => pos.id === currentEmployee.pointOfSaleId)?.name ?? "Sin punto asignado"} · Ingreso ${formatDate(currentEmployee.startDate)}`}
        actions={
          session?.role === "employee" ? null : (
            <Button variant="outline" asChild>
              <Link to="/panel">Volver a RRHH</Link>
            </Button>
          )
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              section === tab.to
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {(section === "/portal" || section === "/portal/nomina") && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Último neto pagado"
              value={lastPaid ? formatCOP(payrollTotals(lastPaid.lines).net) : "—"}
              hint={lastPaid ? formatMonth(lastPaid.period) : "Sin pagos cerrados"}
              icon={Wallet}
              tone="success"
            />
            <StatCard
              label="Recibo del periodo"
              value={
                current
                  ? current.status === "pagado"
                    ? formatCOP(payrollTotals(current.lines).net)
                    : "En proceso"
                  : "—"
              }
              hint={current ? formatMonth(current.period) : "Sin nómina generada"}
              icon={Receipt}
              tone="info"
            />
            <StatCard
              label="Pago mensual base"
              value={formatCOP(
                monthlyCompensation(currentEmployee, currentCompany),
              )}
              hint={
                transportAllowanceFor(currentEmployee, currentCompany) > 0
                  ? `Salario ${formatCOP(currentEmployee.salary)} + auxilio ${formatCOP(transportAllowanceFor(currentEmployee, currentCompany))}`
                  : `Salario ${formatCOP(currentEmployee.salary)} · sin auxilio`
              }
              icon={BadgeCheck}
              tone="brand"
            />
            <StatCard
              label="Días de vacaciones"
              value={`${vacationDays}`}
              hint="Registrados en el histórico"
              icon={Palmtree}
              tone="warning"
            />
          </div>

          <Card className="surface-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
                <Receipt className="size-4 text-primary" /> Mis recibos
              </CardTitle>
              <Link
                to="/portal/vacaciones"
                className="text-xs font-semibold text-primary"
              >
                Pedir vacaciones
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {payrolls.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Aún no hay recibos"
                  description="Cuando RRHH liquide tu nómina, aparecerá aquí para consulta y descarga."
                />
              ) : (
                payrolls.map((payroll) => {
                  const totals = payrollTotals(payroll.lines);
                  return (
                    <div
                      key={payroll.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize text-foreground">
                          {formatMonth(payroll.period)} · Quincena{" "}
                          {payroll.fortnight}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Devengado {formatCOP(totals.gross)} · Deducciones{" "}
                          {formatCOP(totals.deductions)}
                        </p>
                        {payroll.status !== "pagado" ? (
                          <p className="text-[10px] text-warning">
                            Pendiente de pago · el comprobante se habilita
                            cuando RR.HH. marque la nómina como pagada.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatCOP(totals.net)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Neto</p>
                        </div>
                        <StatusPill status={payroll.status} />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={payroll.status !== "pagado"}
                          onClick={async () => {
                            const consecutive = await nextConsecutive(
                              currentCompany.id,
                              "comprobante-nomina",
                            );
                            await downloadPayslipPdf(
                              payroll,
                              signedEmployee,
                              currentCompany,
                              consecutive,
                            );
                          }}
                        >
                          <Download className="size-3.5" /> PDF
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
              <p className="pt-1 text-[10px] text-muted-foreground">
                El recibo se habilita para descarga cuando RRHH confirma el pago.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {(section === "/portal" || section === "/portal/documentos") && (
        <Card className="surface-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
              <FileSignature className="size-4 text-primary" /> Mis documentos
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Contrato, acuerdo de confidencialidad y políticas suscritas con la
              empresa.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents.length === 0 ? (
              <EmptyState
                icon={FileSignature}
                title="Sin documentos"
                description="Tu contrato y las políticas aparecerán aquí cuando RRHH los genere."
              />
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {document.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(document.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={document.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewing(document)}
                    >
                      <Eye className="size-3.5" /> Ver
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {(section === "/portal" || section === "/portal/documentos") && (
        <Card className="surface-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
              <Award className="size-4 text-primary" /> Certificados y
              comprobantes
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Descarga tu certificado laboral o el comprobante de tu último pago.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() =>
                void (async () => {
                  const consecutive = await nextConsecutive(
                    currentCompany.id,
                    "certificado-laboral",
                  );
                  await downloadLaborCertificate(
                    signedEmployee,
                    currentCompany,
                    consecutive,
                  );
                })()
              }
            >
              <Award className="size-4" /> Certificado laboral PDF
            </Button>
            <Button
              variant="outline"
              disabled={!lastPaid}
              onClick={async () => {
                if (!lastPaid) return;
                const consecutive = await nextConsecutive(
                  currentCompany.id,
                  "comprobante-nomina",
                );
                await downloadPayslipPdf(
                  lastPaid,
                  signedEmployee,
                  currentCompany,
                  consecutive,
                );
              }}
            >
              <Receipt className="size-4" /> Último comprobante de nómina
            </Button>
          </CardContent>
        </Card>
      )}

      {(section === "/portal" || section === "/portal/vacaciones") && (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
                <CalendarPlus className="size-4 text-primary" /> Solicitar
                vacaciones
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                La solicitud queda pendiente de aprobación de RRHH.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Desde
                  </Label>
                  <Input
                    type="date"
                    value={vacation.startDate}
                    onChange={(event) =>
                      setVacation((value) => ({
                        ...value,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Hasta
                  </Label>
                  <Input
                    type="date"
                    value={vacation.endDate}
                    onChange={(event) =>
                      setVacation((value) => ({
                        ...value,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Días solicitados:{" "}
                <span className="font-semibold text-foreground">
                  {daysBetween(vacation.startDate, vacation.endDate)}
                </span>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Observaciones
                </Label>
                <Textarea
                  rows={2}
                  value={vacation.notes}
                  onChange={(event) =>
                    setVacation((value) => ({
                      ...value,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
              <Button className="w-full" onClick={() => void requestVacation()}>
                <CalendarDays className="size-4" /> Enviar solicitud
              </Button>
            </CardContent>
          </Card>

          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Mis ausencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {absences.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Sin registros"
                  description="Tus vacaciones, incapacidades y permisos se listarán aquí."
                />
              ) : (
                absences.map((absence) => (
                  <div
                    key={absence.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize text-foreground">
                        {absence.type}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(absence.startDate)} a{" "}
                        {formatDate(absence.endDate)} · {absence.days} días
                      </p>
                    </div>
                    {absenceActions(absence)}
                    <StatusPill status={absence.status} />
                  </div>
                ))
              )}
              <Link
                to="/portal/documentos"
                className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-border p-3 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Revisar mis documentos
                <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-w-3xl gap-0 p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="font-display text-lg">
              {viewing?.title ?? "Documento"}
            </DialogTitle>
            <DialogDescription>
              {viewing
                ? `${DOCUMENT_LABELS[viewing.kind]} · ${formatDate(viewing.createdAt)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto bg-muted/30 p-5 scrollbar-slim">
            {viewingContent ? <DocumentPaper
              content={viewingContent}
              company={currentCompany}
              signed={viewing?.status === "firmado"}
            /> : null}
          </div>
          <DialogFooter className="border-t border-border px-6 py-4">
            {viewingContent ? (
              <Button
                onClick={async () => {
                  if (!viewing) return;
                  const consecutive = await nextConsecutive(
                    currentCompany.id,
                    viewing.kind,
                  );
                  await downloadDocumentPdf(
                    viewingContent,
                    `${viewing.kind}-${currentEmployee.docNumber}.pdf`,
                    currentCompany,
                    consecutive,
                    { signed: viewing.status === "firmado" },
                  );
                }}
              >
                <Download className="size-4" /> Descargar PDF
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {section === "/portal/documentos" && (
        <div className="max-w-xl">
          <SignaturePad
            value={employeeSignatures[currentEmployee.id]}
            onSave={(data) =>
              saveEmployeeSignature(currentEmployee.id, data)
            }
          />
        </div>
      )}

      {section === "/portal/permisos" && (
        <div className="space-y-4">
          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
                <CalendarPlus className="size-4 text-primary" /> Solicitar
                permiso
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Permisos, licencias e incapacidades quedan pendientes de
                aprobación de RR.HH.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Tipo de solicitud
                </Label>
                <Select
                  value={leave.type}
                  onValueChange={(value) =>
                    setLeave((current) => ({
                      ...current,
                      type: value as "permiso" | "licencia" | "incapacidad",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permiso">Permiso</SelectItem>
                    <SelectItem value="licencia">Licencia</SelectItem>
                    <SelectItem value="incapacidad">Incapacidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Desde
                  </Label>
                  <Input
                    type="date"
                    value={leave.startDate}
                    onChange={(event) =>
                      setLeave((value) => ({
                        ...value,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Hasta
                  </Label>
                  <Input
                    type="date"
                    value={leave.endDate}
                    onChange={(event) =>
                      setLeave((value) => ({
                        ...value,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Días solicitados:{" "}
                <span className="font-semibold text-foreground">
                  {daysBetween(leave.startDate, leave.endDate)}
                </span>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Motivo
                </Label>
                <Textarea
                  value={leave.notes}
                  onChange={(event) =>
                    setLeave((value) => ({
                      ...value,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Describe el motivo de la solicitud"
                  rows={3}
                />
              </div>
              <Button className="w-full" onClick={() => void requestLeave()}>
                <CalendarDays className="size-4" /> Enviar solicitud
              </Button>
            </CardContent>
          </Card>

          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Mis solicitudes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {absences.filter((absence) =>
                ["permiso", "licencia", "incapacidad"].includes(absence.type),
              ).length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                  Aún no tienes permisos ni licencias solicitadas.
                </p>
              ) : (
                absences
                  .filter((absence) =>
                    ["permiso", "licencia", "incapacidad"].includes(
                      absence.type,
                    ),
                  )
                  .map((absence) => (
                    <div
                      key={absence.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize text-foreground">
                          {absence.type}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(absence.startDate)} al{" "}
                          {formatDate(absence.endDate)} · {absence.days} días
                          {absence.notes ? ` · ${absence.notes}` : ""}
                        </p>
                      </div>
                      {absenceActions(absence)}
                      <StatusPill status={absence.status} />
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {section === "/portal/prestamos" && (
        <Card className="surface-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
                <HandCoins className="size-4 text-primary" /> Préstamos y
                descuentos
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Solicita un préstamo a la empresa y autoriza el descuento de la
                cuota en tu nómina. RR.HH. revisa y aprueba la solicitud.
              </p>
            </div>
            <Button size="sm" onClick={() => setLoanOpen(true)}>
              <HandCoins className="size-3.5" /> Solicitar préstamo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loans.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                Aún no tienes solicitudes de préstamo.
              </p>
            ) : (
              loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {formatCOP(loan.amount)} · {loan.installments}{" "}
                        {loan.installments === 1 ? "cuota" : "cuotas"} de{" "}
                        {formatCOP(loanQuota(loan))}
                      </p>
                      <Pill
                        tone={
                          loan.status === "aprobado"
                            ? "success"
                            : loan.status === "solicitado"
                              ? "warning"
                              : loan.status === "rechazado"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {loan.status}
                      </Pill>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Solicitado {formatDate(loan.requestedAt.slice(0, 10))} ·
                      Primer descuento{" "}
                      {loan.startPeriod
                        ? formatMonth(loan.startPeriod)
                        : "siguiente nómina"}
                      {loan.reason ? ` · ${loan.reason}` : ""}
                    </p>
                  </div>
                  {loan.status !== "rechazado" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void downloadLoan(loan)}
                    >
                      <Download className="size-3.5" /> Formato
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(editingAbsence)}
        onOpenChange={(open) => !open && setEditingAbsence(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Editar solicitud
            </DialogTitle>
            <DialogDescription>
              Puedes ajustar tu solicitud mientras esté pendiente de aprobación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Tipo
              </Label>
              <Select
                value={absenceForm.type}
                onValueChange={(value) =>
                  setAbsenceForm((current) => ({
                    ...current,
                    type: value as Absence["type"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="permiso">Permiso</SelectItem>
                  <SelectItem value="licencia">Licencia</SelectItem>
                  <SelectItem value="incapacidad">Incapacidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Desde
                </Label>
                <Input
                  type="date"
                  value={absenceForm.startDate}
                  onChange={(event) =>
                    setAbsenceForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  type="date"
                  value={absenceForm.endDate}
                  onChange={(event) =>
                    setAbsenceForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Motivo
              </Label>
              <Textarea
                rows={3}
                value={absenceForm.notes}
                onChange={(event) =>
                  setAbsenceForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Describe el motivo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAbsence(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveAbsence()}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loanOpen} onOpenChange={setLoanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Solicitar préstamo
            </DialogTitle>
            <DialogDescription>
              La solicitud se envía a Recursos Humanos y, al aprobarse, autoriza
              el descuento de la cuota en tu nómina.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Monto que necesitas
              </Label>
              <Input
                type="number"
                min={0}
                step={50000}
                value={loanForm.amount || ""}
                onChange={(event) =>
                  setLoanForm((current) => ({
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
                value={loanForm.installments || ""}
                onChange={(event) =>
                  setLoanForm((current) => ({
                    ...current,
                    installments: Number(event.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Cuota mensual estimada:{" "}
              <span className="font-semibold text-foreground">
                {formatCOP(
                  loanForm.amount > 0
                    ? Math.round(
                        loanForm.amount / Math.max(1, loanForm.installments),
                      )
                    : 0,
                )}
              </span>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Motivo
              </Label>
              <Textarea
                value={loanForm.reason}
                onChange={(event) =>
                  setLoanForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="Cuéntanos para qué necesitas el préstamo"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={loanSaving} onClick={() => void requestLoan()}>
              {loanSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
