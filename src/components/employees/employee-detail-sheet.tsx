import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarDays,
  Calculator,
  FileSignature,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  UserMinus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
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
import {
  monthlyCompensation,
  payrollTotals,
  transportAllowanceFor,
} from "@/lib/payroll";
import type { Company, Employee } from "@/data/types";

const DataRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-right text-xs font-medium text-foreground">
      {value}
    </span>
  </div>
);

export const EmployeeDetailSheet = ({
  employee,
  company,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  employee: Employee | null;
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const { companyPayrolls, companyDocuments, retireEmployee } = useApp();
  const navigate = useNavigate();

  if (!employee) return null;

  const pos = company.pointsOfSale.find(
    (item) => item.id === employee.pointOfSaleId,
  );
  const payrolls = companyPayrolls
    .filter((payroll) => payroll.employeeId === employee.id)
    .slice(0, 4);
  const documents = companyDocuments.filter(
    (document) => document.employeeId === employee.id,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto scrollbar-slim sm:max-w-[560px]">
        <SheetHeader className="space-y-4 pb-4">
          <div className="flex items-start gap-3">
            <EmployeeAvatar
              firstName={employee.firstName}
              lastName={employee.lastName}
              className="size-14 text-base"
            />
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-display text-xl leading-tight">
                {fullName(employee)}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {employee.position} · {employee.department}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusPill status={employee.status} />
                <StatusPill status={employee.contractType} />
                {employee.integralSalary ? (
                  <StatusPill status="integral" label="Salario integral" />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="size-3.5" /> Editar ficha
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(`/documentos?empleado=${employee.id}`)
              }
            >
              <FileSignature className="size-3.5" /> Generar documento
            </Button>
            {employee.status === "retirado" &&
            employee.contractType !== "prestacion-servicios" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/liquidaciones?empleado=${employee.id}`);
                }}
              >
                <Calculator className="size-3.5" /> Liquidación final
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive-soft hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" /> Eliminar
            </Button>
            {employee.status === "activo" ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                  >
                    <UserMinus className="size-3.5" /> Retirar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Retirar a {fullName(employee)}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      El empleado saldrá de la plantilla activa y no se incluirá
                      en las próximas nóminas. Su histórico de pagos y
                      documentos se conserva.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await retireEmployee(employee.id);
                        onOpenChange(false);
                        if (employee.contractType !== "prestacion-servicios") {
                          navigate(`/liquidaciones?empleado=${employee.id}`);
                        }
                      }}
                    >
                      Retirar y liquidar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        </SheetHeader>

        <Separator />

        <div className="space-y-6 py-5">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Briefcase className="size-3.5 text-primary" /> Vinculación
            </h3>
            <div className="divide-y divide-border rounded-xl border border-border px-4">
              <DataRow
                label="Documento"
                value={`${employee.docType} ${employee.docNumber}`}
              />
              <DataRow label="Ingreso" value={formatDate(employee.startDate)} />
              <DataRow
                label="Fecha de retiro"
                value={employee.endDate ? formatDate(employee.endDate) : "—"}
              />
              <DataRow
                label="Punto de venta"
                value={pos ? `${pos.name} · ${pos.city}` : "Sin asignar"}
              />
              <DataRow
                label="Contrato"
                value={employee.contractType.replace("-", " ")}
              />
              <DataRow
                label="Jornada"
                value={`${company.params.weeklyHours} horas semanales`}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Landmark className="size-3.5 text-primary" /> Salario y
              seguridad social
            </h3>
            <div className="divide-y divide-border rounded-xl border border-border px-4">
              <DataRow
                label="Salario básico"
                value={`${formatCOP(employee.salary)} / mes`}
              />
              <DataRow
                label="Auxilio de transporte"
                value={
                  transportAllowanceFor(employee, company) > 0
                    ? formatCOP(transportAllowanceFor(employee, company))
                    : "No aplica"
                }
              />
              <DataRow
                label="Total mensual"
                value={`${formatCOP(monthlyCompensation(employee, company))} / mes`}
              />
              <DataRow label="EPS" value={employee.eps || "—"} />
              <DataRow label="Pensión" value={employee.pensionFund || "—"} />
              <DataRow
                label="Caja de compensación"
                value={employee.compensationFund || "—"}
              />
              <DataRow
                label="ARL"
                value={`${employee.arlProvider || "Sin registrar"} · Nivel ${employee.riskLevel}`}
              />
              <DataRow
                label="Banco"
                value={`${employee.bank || "—"} · ${employee.accountNumber || "—"}`}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Mail className="size-3.5 text-primary" /> Contacto
            </h3>
            <div className="space-y-2 rounded-xl border border-border p-4 text-xs text-foreground">
              <p className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground" />{" "}
                {employee.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground" />{" "}
                {employee.phone}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground" />{" "}
                {employee.address}, {employee.city}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="size-3.5 text-muted-foreground" /> Nació
                el {formatDate(employee.birthDate)}
              </p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Últimos recibos
            </h3>
            <div className="overflow-hidden rounded-xl border border-border">
              {payrolls.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Sin nóminas generadas todavía.
                </p>
              ) : (
                payrolls.map((payroll) => {
                  const totals = payrollTotals(payroll.lines);
                  return (
                    <div
                      key={payroll.id}
                      className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-medium capitalize text-foreground">
                          {formatMonth(payroll.period)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Neto {formatCOP(totals.net)}
                        </p>
                      </div>
                      <StatusPill status={payroll.status} />
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documentos generados ({documents.length})
            </h3>
            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                  Aún no hay contratos ni políticas generadas para este
                  empleado.
                </p>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">
                        {document.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <StatusPill status={document.status} />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};
