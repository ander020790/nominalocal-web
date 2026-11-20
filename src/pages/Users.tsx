import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Building2,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users as UsersIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatNumber } from "@/lib/format";

const emptyForm = {
  companyId: "",
  role: "admin" as "admin" | "employee",
  name: "",
  email: "",
  employeeId: "",
  password: "",
};

export const Users = () => {
  const {
    companies,
    employees,
    members,
    createCompanyUser,
    resetCompanyUserPassword,
    revokeMember,
    viewRole,
    session,
    currentCompany,
  } = useApp();
  const isAdmin = viewRole === "admin" && session?.role !== "owner";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<{
    title: string;
    note: string;
    email: string;
    password: string | null;
  } | null>(null);
  const [resetMember, setResetMember] = useState<
    (typeof members)[number] | null
  >(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const effectiveRole = isAdmin ? "employee" : form.role;

  // Si hay una empresa activa (administrador o principal supervisando),
  // la página se limita a esa empresa para no mezclar usuarios.
  const scopedCompanies = currentCompany ? [currentCompany] : companies;
  const activeCompanies = scopedCompanies.filter(
    (company) => company.status === "activa",
  );
  const visibleMemberIds = new Set(scopedCompanies.map((company) => company.id));
  const visibleMembers = members.filter(
    (member) => member.companyId && visibleMemberIds.has(member.companyId),
  );

  const companyEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.companyId === form.companyId &&
          employee.status === "activo",
      ),
    [employees, form.companyId],
  );

  const openFor = (companyId?: string) => {
    setForm({
      ...emptyForm,
      role: isAdmin ? "employee" : "admin",
      companyId:
        currentCompany?.id ??
        companyId ??
        activeCompanies[0]?.id ??
        companies[0]?.id ??
        "",
    });
    setError("");
    setOpen(true);
  };

  const submit = async () => {
    setError("");
    const email = form.email.trim().toLowerCase();
    if (!form.companyId) {
      setError("Selecciona la empresa.");
      return;
    }
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Escribe el nombre y un correo válido.");
      return;
    }
    if (effectiveRole === "employee" && !form.employeeId) {
      setError("Selecciona el empleado al que corresponde el acceso.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setError("La contraseña temporal debe tener al menos 8 caracteres.");
      return;
    }
    const result = await createCompanyUser({
      companyId: form.companyId,
      name: form.name.trim(),
      email,
      role: effectiveRole,
      employeeId: effectiveRole === "employee" ? form.employeeId : null,
      password: form.password || undefined,
    });
    if (!result) return;
    setOpen(false);
    setForm(emptyForm);
    setCredentials({
      title: result.created ? "Cuenta creada" : "Cuenta vinculada",
      note:
        result.message ??
        (result.created
          ? "Comparte estas credenciales con la persona. La contraseña no se volverá a mostrar."
          : "La cuenta ya existía y quedó asignada a la empresa."),
      email: result.email,
      password: result.password,
    });
  };

  const submitReset = async () => {
    if (!resetMember) return;
    setResetError("");
    if (resetPassword && resetPassword.length < 8) {
      setResetError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setResetBusy(true);
    const result = await resetCompanyUserPassword(
      resetMember.id,
      resetPassword || undefined,
    );
    setResetBusy(false);
    if (!result) return;
    setResetMember(null);
    setResetPassword("");
    setCredentials({
      title: "Contraseña actualizada",
      note: "Comparte la nueva clave con la persona. No se volverá a mostrar.",
      email: result.email,
      password: result.password,
    });
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={
          isAdmin
            ? currentCompany?.name ?? companies[0]?.name ?? "Administración de RRHH"
            : currentCompany?.name ?? "Panel del usuario principal"
        }
        title={
          currentCompany ? `Usuarios de ${currentCompany.name}` : "Usuarios y accesos"
        }
        description={
          currentCompany
            ? `Crea y administra únicamente las cuentas de ${currentCompany.name}. Los accesos de otras empresas no se muestran aquí.`
            : "Asigna a cada empresa su administrador de RRHH y los empleados que entran al portal."
        }
        actions={
          <Button onClick={() => openFor()}>
            <UserPlus className="size-4" /> Asignar usuario
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Empresas activas"
          value={formatNumber(activeCompanies.length)}
          hint={`${scopedCompanies.length} en esta vista`}
          icon={Building2}
        />
        <StatCard
          label="Usuarios vinculados"
          value={formatNumber(visibleMembers.length)}
          hint="Administradores y empleados"
          icon={UsersIcon}
          tone="success"
        />
        <StatCard
          label="Administradores RRHH"
          value={formatNumber(
            visibleMembers.filter((member) => member.role === "admin").length,
          )}
          hint="Con acceso a la nómina de su empresa"
          icon={ShieldCheck}
          tone="info"
        />
      </div>

      {scopedCompanies.length === 0 ? (
        <Card className="surface-card border-0">
          <CardContent className="p-6">
            <EmptyState
              icon={Building2}
              title="Primero crea una empresa"
              description="Cuando tengas una empresa podrás asignarle su administrador de RRHH y los accesos de sus empleados."
              action={
                <Button asChild>
                  <Link to="/empresas">Ir a Empresas</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scopedCompanies.map((company) => {
            const companyUsers = members.filter(
              (member) => member.companyId === company.id,
            );
            return (
              <Card key={company.id} className="surface-card border-0">
                <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Building2 className="size-4" />
                    </span>
                    <div>
                      <CardTitle className="font-display text-base font-semibold">
                        {company.name}
                      </CardTitle>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        NIT {company.nit} · {companyUsers.length} usuarios con
                        acceso
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={company.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openFor(company.id)}
                    >
                      <UserPlus className="size-3.5" /> Asignar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {companyUsers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                      Esta empresa aún no tiene usuarios. Asigna a su
                      administrador de RRHH para que gestione la nómina.
                    </p>
                  ) : null}

                  {companyUsers.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                    >
                      <EmployeeAvatar
                        firstName={member.name.split(" ")[0] ?? member.email}
                        lastName={member.name.split(" ")[1] ?? ""}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.name || member.email}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                          {member.role === "admin" ? (
                            <>
                              <ShieldCheck className="size-3" /> Administrador
                              RRHH
                            </>
                          ) : (
                            <>
                              <UsersIcon className="size-3" /> Empleado
                            </>
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setResetMember(member);
                            setResetPassword("");
                            setResetError("");
                          }}
                        >
                          <KeyRound className="size-3.5" /> Clave
                        </Button>
                        {!isAdmin || member.role === "employee" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" /> Revocar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Revocar el acceso de {member.name || member.email}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                La persona dejará de ver esta empresa y su
                                nómina. Su cuenta seguirá existiendo, pero sin
                                acceso a esta compañía.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => void revokeMember(member.id)}
                              >
                                Revocar acceso
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        ) : null}
                      </div>
                    </div>
                  ))}

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setForm(emptyForm);
            setError("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Crear cuenta de acceso
            </DialogTitle>
            <DialogDescription>
              El usuario principal crea la cuenta y define una contraseña
              temporal. Compártela con la persona para que ingrese.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {isAdmin ? (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">
                  Empresa (fija para tu usuario)
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {companies[0]?.name ?? "Sin empresa"}
                </p>
              </div>
            ) : (
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Empresa
                </Label>
                <Select
                  value={form.companyId}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      companyId: value,
                      employeeId: "",
                      name: "",
                      email: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopedCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAdmin ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                Se creará una cuenta de <strong>empleado</strong> con acceso solo
                a su portal.
              </p>
            ) : (
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Tipo de acceso
                </Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      role: value as "admin" | "employee",
                      employeeId: "",
                      name: "",
                      email: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador de RRHH</SelectItem>
                    <SelectItem value="employee">Empleado · portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {effectiveRole === "employee" ? (
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Empleado
                </Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(value) => {
                    const employee = companyEmployees.find(
                      (item) => item.id === value,
                    );
                    setForm({
                      ...form,
                      employeeId: value,
                      name: employee
                        ? `${employee.firstName} ${employee.lastName}`
                        : form.name,
                      email: employee?.email || form.email,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} ·{" "}
                        {employee.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {companyEmployees.length === 0 ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Esta empresa no tiene empleados activos. Agrégalos primero
                    en Empleados.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Nombre
                </Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Correo
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="persona@empresa.co"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Contraseña temporal (opcional)
              </Label>
              <Input
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                placeholder={
                  effectiveRole === "employee"
                    ? "Déjala vacía para usar la cédula"
                    : "Si la dejas vacía, generamos una segura"
                }
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {effectiveRole === "employee"
                  ? "La clave inicial será la cédula del empleado (sin puntos ni espacios). Se muestra una sola vez al crear la cuenta."
                  : "Mínimo 8 caracteres. Se mostrará una sola vez al crear la cuenta para que la compartas."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()}>
              <UserPlus className="size-4" /> Crear cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetMember)}
        onOpenChange={(next) => {
          if (!next) {
            setResetMember(null);
            setResetPassword("");
            setResetError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Asignar nueva clave
            </DialogTitle>
            <DialogDescription>
              {resetMember?.name || resetMember?.email}. Por seguridad no se
              puede ver la contraseña actual; al guardar se reemplaza por la
              nueva y se muestra una sola vez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Contraseña temporal (opcional)
              </Label>
              <Input
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder={
                  resetMember?.role === "employee"
                    ? "Déjala vacía para usar la cédula"
                    : "Si la dejas vacía, generamos una segura"
                }
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {resetMember?.role === "employee"
                  ? "Si la dejas vacía, la nueva clave será la cédula del empleado."
                  : "Mínimo 8 caracteres."}
              </p>
            </div>
            {resetError ? (
              <p className="rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive">
                {resetError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetMember(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void submitReset()} disabled={resetBusy}>
              {resetBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Guardar clave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(credentials)}
        onOpenChange={(next) => !next && setCredentials(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {credentials?.title}
            </DialogTitle>
            <DialogDescription>{credentials?.note}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Correo: </span>
              <span className="font-medium text-foreground">
                {credentials?.email}
              </span>
            </p>
            {credentials?.password ? (
              <p>
                <span className="text-muted-foreground">
                  Contraseña temporal:{" "}
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {credentials.password}
                </span>
              </p>
            ) : null}
          </div>

          <DialogFooter>
            {credentials?.password ? (
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `Correo: ${credentials.email}\nContraseña: ${credentials.password}`,
                  );
                  toast.success("Credenciales copiadas.");
                }}
              >
                Copiar credenciales
              </Button>
            ) : null}
            <Button onClick={() => setCredentials(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
