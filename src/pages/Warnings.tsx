import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { Pill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDate, fullName } from "@/lib/format";
import { nextConsecutive } from "@/lib/consecutive";
import { downloadWarningPdf } from "@/lib/warning-pdf";
import type { Tables } from "@/integrations/supabase/types";

type WarningRow = Tables<"payroll_warnings">;

interface Warning {
  id: string;
  employeeId: string;
  warningDate: string;
  reason: string;
  description: string;
  severity: "leve" | "grave" | "muy-grave";
}

const mapRow = (row: WarningRow): Warning => ({
  id: row.id,
  employeeId: row.employee_id,
  warningDate: row.warning_date.slice(0, 10),
  reason: row.reason,
  description: row.description,
  severity: row.severity as Warning["severity"],
});

const severityTone = {
  leve: "neutral",
  grave: "warning",
  "muy-grave": "danger",
} as const;

export const Warnings = () => {
  const { currentCompany, companyEmployees, employeeSignatures, refresh } = useApp();
  const [rows, setRows] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    warningDate: new Date().toISOString().slice(0, 10),
    reason: "",
    description: "",
    severity: "leve" as Warning["severity"],
  });

  const employees = useMemo(
    () =>
      companyEmployees.filter(
        (employee) =>
          employee.status === "activo" &&
          employee.contractType !== "prestacion-servicios",
      ),
    [companyEmployees],
  );

  const load = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll_warnings")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("warning_date", { ascending: false });
    if (error) toast.error("No pudimos cargar los llamados de atención.");
    else setRows((data ?? []).map(mapRow));
    setLoading(false);
  }, [currentCompany]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!currentCompany) return;
    if (!form.employeeId || !form.reason.trim()) {
      toast.error("Selecciona el colaborador e indica el motivo.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("payroll_warnings").insert({
      company_id: currentCompany.id,
      employee_id: form.employeeId,
      warning_date: form.warningDate,
      reason: form.reason.trim(),
      description: form.description.trim(),
      severity: form.severity,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Llamado de atención registrado.");
    await refresh();
    setOpen(false);
    void load();
  };

  const remove = async (row: Warning) => {
    const { error } = await supabase
      .from("payroll_warnings")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Llamado eliminado.");
    void load();
  };

  if (!currentCompany) return null;

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany.name}
        title="Llamados de atención"
        description="Registra llamados de atención por fallas, con fecha, motivo, gravedad y descripción de los hechos."
        actions={
          <Button
            onClick={() => {
              setForm({
                employeeId: employees[0]?.id ?? "",
                warningDate: new Date().toISOString().slice(0, 10),
                reason: "",
                description: "",
                severity: "leve",
              });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Nuevo llamado
          </Button>
        }
      />

      <Card className="surface-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <AlertTriangle className="size-4 text-primary" /> Historial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Cargando…
            </p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Sin llamados registrados"
              description="Registra un llamado de atención cuando un colaborador incurra en una falta."
            />
          ) : (
            rows.map((row) => {
              const employee = companyEmployees.find(
                (item) => item.id === row.employeeId,
              );
              return (
                <div
                  key={row.id}
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
                      <Pill tone={severityTone[row.severity]}>
                        {row.severity.replace("-", " ")}
                      </Pill>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(row.warningDate)} · {row.reason}
                      {row.description ? ` · ${row.description}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!employee}
                    onClick={async () => {
                      if (!employee) return;
                      try {
                        const consecutive = await nextConsecutive(currentCompany.id, "llamado-atencion");
                        await downloadWarningPdf(row, { ...employee, signatureData: employeeSignatures[employee.id] }, currentCompany, consecutive);
                      } catch {
                        toast.error("No pudimos generar el documento del llamado de atención.");
                      }
                    }}
                  >
                    <Download className="size-4" /> Descargar PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!employee}
                    onClick={async () => {
                      if (!employee) return;
                      const printWindow = window.open("", "_blank");
                      if (!printWindow) {
                        toast.error("Permite las ventanas emergentes para imprimir o descarga el PDF.");
                        return;
                      }
                      try {
                        const consecutive = await nextConsecutive(currentCompany.id, "llamado-atencion");
                        await downloadWarningPdf(row, { ...employee, signatureData: employeeSignatures[employee.id] }, currentCompany, consecutive, printWindow);
                      } catch {
                        printWindow.close();
                        toast.error("No pudimos preparar el documento para imprimir.");
                      }
                    }}
                  >
                    <Printer className="size-4" /> Imprimir
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void remove(row)}
                    aria-label="Eliminar llamado"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Nuevo llamado de atención
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
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {fullName(employee)} · {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Fecha
                </Label>
                <Input
                  type="date"
                  value={form.warningDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      warningDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Gravedad
                </Label>
                <Select
                  value={form.severity}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      severity: value as Warning["severity"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                    <SelectItem value="muy-grave">Muy grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                placeholder="Falta, retardo, incumplimiento…"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Descripción de los hechos
              </Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Detalla lo ocurrido, fecha, lugar y testigos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Guardando…" : "Guardar llamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
