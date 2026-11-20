import { useState } from "react";
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  Check,
  Pencil,
  Clock,
  Palmtree,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/context/app-context-value";
import { daysBetween, formatDate, fullName } from "@/lib/format";
import type { AbsenceType } from "@/data/types";

const typeLabels: Record<AbsenceType, string> = {
  vacaciones: "Vacaciones",
  incapacidad: "Incapacidad",
  permiso: "Permiso remunerado",
  licencia: "Licencia",
  "no-remunerada": "No remunerada",
};

const typeIcons: Record<AbsenceType, typeof Palmtree> = {
  vacaciones: Palmtree,
  incapacidad: Stethoscope,
  permiso: Clock,
  licencia: CalendarDays,
  "no-remunerada": Ban,
};

export const Absences = () => {
  const {
    currentCompany,
    companyEmployees,
    companyAbsences,
    addAbsence,
    updateAbsence,
    deleteAbsence,
    setAbsenceStatus,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("todos");
  const [form, setForm] = useState({
    employeeId: "",
    type: "vacaciones" as AbsenceType,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    notes: "",
    status: "aprobada" as "aprobada" | "pendiente",
  });

  const absences = companyAbsences.filter(
    (absence) => typeFilter === "todos" || absence.type === typeFilter,
  );

  const totalDays = companyAbsences
    .filter((absence) => absence.status === "aprobada")
    .reduce((sum, absence) => sum + absence.days, 0);
  const vacationDays = companyAbsences
    .filter(
      (absence) => absence.type === "vacaciones" && absence.status === "aprobada",
    )
    .reduce((sum, absence) => sum + absence.days, 0);
  const pending = companyAbsences.filter(
    (absence) => absence.status === "pendiente",
  ).length;

  const submit = async () => {
    if (!form.employeeId || saving) return;
    setSaving(true);
    const days = daysBetween(form.startDate, form.endDate);
    if (editingId) {
      await updateAbsence(editingId, {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        days,
        notes: form.notes,
      });
    } else {
      await addAbsence({
        employeeId: form.employeeId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        days,
        notes: form.notes,
        status: form.status,
      });
    }
    setSaving(false);
    setEditingId(null);
    setOpen(false);
    setForm((current) => ({
      ...current,
      employeeId: "",
      notes: "",
      type: "vacaciones",
    }));
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany?.name}
        title="Ausencias"
        description="Vacaciones, incapacidades y permisos con su efecto informativo en la liquidación del mes."
        actions={
          <Button onClick={() => setOpen(true)}>
            <CalendarPlus className="size-4" /> Registrar ausencia
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Días aprobados"
          value={`${totalDays}`}
          hint="En el histórico de la empresa"
          icon={CalendarDays}
          tone="brand"
        />
        <StatCard
          label="Días de vacaciones"
          value={`${vacationDays}`}
          hint="Acumulados aprobados"
          icon={Palmtree}
          tone="success"
        />
        <StatCard
          label="Solicitudes pendientes"
          value={`${pending}`}
          hint="Requieren revisión de RRHH"
          icon={Clock}
          tone="warning"
        />
      </div>

      <Card className="surface-card border-0">
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-4" />
              {absences.length} registros
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="vacaciones">Vacaciones</SelectItem>
                <SelectItem value="incapacidad">Incapacidades</SelectItem>
                <SelectItem value="permiso">Permisos</SelectItem>
                <SelectItem value="licencia">Licencias</SelectItem>
                <SelectItem value="no-remunerada">No remuneradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {absences.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin ausencias registradas"
                description="Registra vacaciones, incapacidades o permisos para llevar el control del periodo."
                action={
                  <Button size="sm" onClick={() => setOpen(true)}>
                    Registrar ausencia
                  </Button>
                }
              />
            ) : (
              absences.map((absence) => {
                const employee = companyEmployees.find(
                  (item) => item.id === absence.employeeId,
                );
                if (!employee) return null;
                const Icon = typeIcons[absence.type];
                return (
                  <div
                    key={absence.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                  >
                    <EmployeeAvatar
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {fullName(employee)}
                        </p>
                        <StatusPill status={absence.status} />
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Icon className="size-3.5" />
                        {typeLabels[absence.type]} ·{" "}
                        {formatDate(absence.startDate)} a{" "}
                        {formatDate(absence.endDate)} · {absence.days}{" "}
                        {absence.days === 1 ? "día" : "días"}
                      </p>
                      {absence.notes ? (
                        <p className="mt-1 text-[11px] text-muted-foreground/80">
                          {absence.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground"
                        aria-label="Editar ausencia"
                        onClick={() => {
                          setEditingId(absence.id);
                          setForm({
                            employeeId: absence.employeeId,
                            type: absence.type,
                            startDate: absence.startDate,
                            endDate: absence.endDate,
                            notes: absence.notes ?? "",
                            status:
                              absence.status === "aprobada"
                                ? "aprobada"
                                : "pendiente",
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Eliminar ausencia"
                        onClick={() => void deleteAbsence(absence.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    {absence.status === "pendiente" ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success hover:bg-success-soft hover:text-success"
                          onClick={() =>
                            void setAbsenceStatus(absence.id, "aprobada")
                          }
                        >
                          <Check className="size-3.5" /> Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                          onClick={() =>
                            void setAbsenceStatus(absence.id, "rechazada")
                          }
                        >
                          <X className="size-3.5" /> Rechazar
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {editingId ? "Editar ausencia" : "Registrar ausencia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Empleado
              </Label>
              <Select
                value={form.employeeId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, employeeId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {companyEmployees
                    .filter((employee) => employee.status === "activo")
                    .map((employee) => (
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
                  Tipo
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      type: value as AbsenceType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacaciones">Vacaciones</SelectItem>
                    <SelectItem value="incapacidad">Incapacidad</SelectItem>
                    <SelectItem value="permiso">Permiso remunerado</SelectItem>
                    <SelectItem value="licencia">Licencia</SelectItem>
                    <SelectItem value="no-remunerada">
                      No remunerada
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Estado inicial
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as "aprobada" | "pendiente",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprobada">Aprobada</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Desde
                </Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({
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
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Días hábiles del registro:{" "}
              <span className="font-semibold text-foreground">
                {daysBetween(form.startDate, form.endDate)}
              </span>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Observaciones
              </Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Soporte, autorización o detalle de la novedad"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void submit()}>
              {saving
                ? "Guardando…"
                : editingId
                  ? "Actualizar ausencia"
                  : "Guardar ausencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
