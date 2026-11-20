import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleSlash,
  Plus,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { RutUpload } from "@/components/companies/rut-upload";
import { useApp } from "@/context/app-context-value";
import { payrollTotals } from "@/lib/payroll";
import { formatCOP, formatDate, formatNumber } from "@/lib/format";
import type { RutPointOfSale } from "@/lib/rut";

const emptyCompany = {
  name: "",
  nit: "",
  city: "",
  department: "",
  address: "",
  phone: "",
  email: "",
  legalRep: "",
  legalRepDoc: "",
  adminName: "",
  economicActivity: "",
  taxResponsibilities: "",
  pointsOfSale: [] as RutPointOfSale[],
};

export const Companies = () => {
  const {
    companies,
    employees,
    payrolls,
    period,
    addCompany,
    toggleCompanyStatus,
    impersonateCompany,
  } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyCompany);

  const costOf = (companyId: string) =>
    payrolls
      .filter(
        (payroll) =>
          payroll.companyId === companyId && payroll.period === period,
      )
      .reduce((sum, payroll) => sum + payrollTotals(payroll.lines).totalCost, 0);

  const active = companies.filter((company) => company.status === "activa");
  const totalEmployees = employees.filter(
    (employee) => employee.status === "activo",
  ).length;
  const totalCost = companies.reduce(
    (sum, company) => sum + costOf(company.id),
    0,
  );

  const submit = () => {
    if (!form.name || !form.nit) return;
    addCompany(form);
    setForm(emptyCompany);
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow="Panel del usuario principal"
        title="Empresas"
        description="Cada empresa tiene sus propios empleados, parámetros de nómina, puntos de venta, plantillas y usuarios. La información nunca se comparte entre empresas."
        actions={
          <Button
            onClick={() => {
              setForm(emptyCompany);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Crear empresa
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Empresas"
          value={formatNumber(companies.length)}
          hint={`${active.length} activas · ${companies.length - active.length} inactivas`}
          icon={Building2}
        />
        <StatCard
          label="Colaboradores"
          value={formatNumber(totalEmployees)}
          hint="Suma de plantillas activas"
          icon={Users}
          tone="success"
        />
        <StatCard
          label="Coste del mes"
          value={formatCOP(totalCost)}
          hint="Todas las empresas, aportes incluidos"
          icon={Store}
          tone="warning"
        />
        <StatCard
          label="Puntos de venta"
          value={formatNumber(
            companies.reduce(
              (sum, company) => sum + company.pointsOfSale.length,
              0,
            ),
          )}
          hint="Canales autorizados de venta"
          icon={Store}
          tone="info"
        />
      </div>

      {companies.length === 0 ? (
        <Card className="surface-card border-0">
          <CardContent className="p-6">
            <EmptyState
              icon={Building2}
              title="Aún no hay empresas"
              description="Crea la primera empresa para configurar su nómina, puntos de venta y documentos. El primer usuario registrado es el usuario principal."
              action={
                <Button
                  onClick={() => {
                    setForm(emptyCompany);
                    setOpen(true);
                  }}
                >
                  <Plus className="size-4" /> Crear empresa
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        {companies.map((company) => {
          const companyEmployees = employees.filter(
            (employee) =>
              employee.companyId === company.id && employee.status === "activo",
          );
          return (
            <Card key={company.id} className="surface-card border-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
                      <Building2 className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-foreground">
                        {company.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        NIT {company.nit} · {company.city}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={company.status} />
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                          {company.pointsOfSale.length} puntos de venta
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                      Coste mes
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {formatCOP(costOf(company.id))}
                    </span>
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-muted-foreground">Plantilla activa</p>
                    <p className="text-sm font-semibold text-foreground">
                      {companyEmployees.length} personas
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-muted-foreground">Empresa creada</p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {formatDate(company.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      impersonateCompany(company.id);
                      navigate("/panel");
                    }}
                    disabled={company.status === "inactiva"}
                  >
                    Entrar <ArrowRight className="size-3.5" />
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    Asigna su usuario en Usuarios y accesos
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-muted-foreground"
                      >
                        {company.status === "activa" ? (
                          <>
                            <CircleSlash className="size-3.5" /> Desactivar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" /> Activar
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {company.status === "activa"
                            ? `¿Desactivar ${company.name}?`
                            : `¿Activar ${company.name}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {company.status === "activa"
                            ? "Sus usuarios perderán el acceso y no se podrá entrar a la empresa. El histórico de nóminas y documentos se conserva."
                            : "Los usuarios de la empresa podrán volver a iniciar sesión y operar con su información."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => toggleCompanyStatus(company.id)}
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      <Card className="border-primary/20 bg-primary-soft/50">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Empresas independientes y parametrizables
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Al crear una empresa se copian los parámetros y plantillas base.
              Desde ese momento cada compañía edita su SMMLV, UVT, porcentajes,
              puntos de venta, conceptos y cláusulas sin afectar a las demás. Las
              nóminas cerradas conservan los valores con los que se liquidaron.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setForm(emptyCompany);
        }}
      >
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="font-display text-lg">
              Crear empresa
            </DialogTitle>
            <DialogDescription>
              Se crea como espacio independiente con sus parámetros iniciales.
              Al guardar, asigna al administrador de RRHH desde Usuarios y
              accesos.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[62vh] px-6 py-5">
            <RutUpload
              onExtracted={(data) =>
                setForm((current) => ({
                  ...current,
                  name: data.name || current.name,
                  nit: data.nit || current.nit,
                  city: data.city || current.city,
                  department: data.department || current.department,
                  address: data.address || current.address,
                  phone: data.phone || current.phone,
                  email: data.email || current.email,
                  legalRep: data.legalRep || current.legalRep,
                  legalRepDoc: data.legalRepDoc || current.legalRepDoc,
                  economicActivity:
                    data.economicActivity || current.economicActivity,
                  taxResponsibilities:
                    data.taxResponsibilities || current.taxResponsibilities,
                  pointsOfSale: data.pointsOfSale,
                }))
              }
            />

            {form.pointsOfSale.length > 0 ? (
              <p className="mt-2 rounded-lg bg-primary-soft/60 px-3 py-2 text-[11px] leading-relaxed text-primary">
                Se crearán {form.pointsOfSale.length} puntos de venta con los
                establecimientos del RUT:{" "}
                {form.pointsOfSale.map((point) => point.name).join(", ")}.
              </p>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Razón social *">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nueva Empresa S.A.S."
                />
              </Field>
              <Field label="NIT *">
                <Input
                  value={form.nit}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                  placeholder="901.234.567-8"
                />
              </Field>
              <Field label="Ciudad">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Bogotá D.C."
                />
              </Field>
              <Field label="Departamento">
                <Input
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder="Cundinamarca"
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+57 601 000 0000"
                />
              </Field>
              <Field label="Dirección" className="sm:col-span-2">
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Calle 100 # 20-30, oficina 501"
                />
              </Field>
              <Field label="Actividad económica" className="sm:col-span-2">
                <Input
                  value={form.economicActivity}
                  onChange={(e) =>
                    setForm({ ...form, economicActivity: e.target.value })
                  }
                  placeholder="4641 - Comercio al por mayor de textiles"
                />
              </Field>
              <Field
                label="Responsabilidades tributarias"
                className="sm:col-span-2"
              >
                <Input
                  value={form.taxResponsibilities}
                  onChange={(e) =>
                    setForm({ ...form, taxResponsibilities: e.target.value })
                  }
                  placeholder="Responsable de IVA, Agente de retención"
                />
              </Field>
              <Field label="Correo de la empresa">
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nomina@empresa.co"
                />
              </Field>
              <Field label="Representante legal">
                <Input
                  value={form.legalRep}
                  onChange={(e) =>
                    setForm({ ...form, legalRep: e.target.value })
                  }
                  placeholder="Nombre completo"
                />
              </Field>
              <Field label="Documento del representante">
                <Input
                  value={form.legalRepDoc}
                  onChange={(e) =>
                    setForm({ ...form, legalRepDoc: e.target.value })
                  }
                  placeholder="CC 79.000.000"
                />
              </Field>
              <Field label="Responsable del punto principal">
                <Input
                  value={form.adminName}
                  onChange={(e) =>
                    setForm({ ...form, adminName: e.target.value })
                  }
                  placeholder="Nombre del jefe de punto de venta"
                />
              </Field>
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              La empresa se crea con los parámetros 2026: SMMLV{" "}
              {formatCOP(1_750_905)}, auxilio de transporte{" "}
              {formatCOP(249_095)} y UVT {formatCOP(52_374)}. Podrás ajustarlos
              en Ajustes. El administrador de RRHH se asigna desde Usuarios y
              accesos.
            </div>
          </ScrollArea>
          <DialogFooter className="border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Crear empresa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);
