import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/context/app-context-value";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeeDetailSheet } from "@/components/employees/employee-detail-sheet";
import { formatCOP, fullName } from "@/lib/format";
import {
  monthlyCompensation,
  transportAllowanceFor,
} from "@/lib/payroll";
import type { Employee } from "@/data/types";

export const Employees = () => {
  const {
    currentCompany,
    companyEmployees,
    deleteEmployee,
    retireEmployee,
    reactivateEmployee,
  } = useApp();
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("todos");
  const [contractFilter, setContractFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("activo");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [retireTarget, setRetireTarget] = useState<Employee | null>(null);
  const [retireReason, setRetireReason] = useState("renuncia");
  const [retireDate, setRetireDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return companyEmployees.filter((employee) => {
      if (statusFilter !== "todos" && employee.status !== statusFilter)
        return false;
      if (posFilter !== "todos" && employee.pointOfSaleId !== posFilter)
        return false;
      if (contractFilter !== "todos" && employee.contractType !== contractFilter)
        return false;
      if (!term) return true;
      return [
        employee.firstName,
        employee.lastName,
        employee.docNumber,
        employee.position,
        employee.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [companyEmployees, search, statusFilter, posFilter, contractFilter]);

  const exportCsv = () => {
    const header = [
      "Nombres",
      "Apellidos",
      "Documento",
      "Cargo",
      "Área",
      "Punto de venta",
      "Contrato",
      "Salario base",
      "Auxilio transporte",
      "Total mensual",
      "Estado",
    ];
    const rows = filtered.map((employee) => [
      employee.firstName,
      employee.lastName,
      `${employee.docType} ${employee.docNumber}`,
      employee.position,
      employee.department,
      currentCompany?.pointsOfSale.find(
        (pos) => pos.id === employee.pointOfSaleId,
      )?.name ?? "",
      employee.contractType,
      employee.salary,
      currentCompany
        ? transportAllowanceFor(employee, currentCompany)
        : 0,
      currentCompany ? monthlyCompensation(employee, currentCompany) : employee.salary,
      employee.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `empleados-${currentCompany?.name ?? "empresa"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const active = companyEmployees.filter((e) => e.status === "activo").length;
  const payrollCost = companyEmployees
    .filter((employee) => employee.status === "activo")
    .reduce(
      (sum, employee) =>
        sum +
        (currentCompany
          ? monthlyCompensation(employee, currentCompany)
          : employee.salary),
      0,
    );

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany?.name}
        title="Empleados"
        description="Ficha única por colaborador: alimenta la nómina, los contratos y los documentos de la empresa."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Nuevo empleado
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="surface-card border-0">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Plantilla activa
              </p>
              <p className="font-display text-xl font-bold">{active}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Users className="size-4" />
            </span>
          </CardContent>
        </Card>
        <Card className="surface-card border-0">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Nómina mensual estimada
              </p>
              <p className="font-display text-xl font-bold">
                {formatCOP(payrollCost)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Incluye auxilio de transporte
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-success">
              <SlidersHorizontal className="size-4" />
            </span>
          </CardContent>
        </Card>
        <Card className="surface-card border-0">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Puntos de venta
              </p>
              <p className="font-display text-xl font-bold">
                {currentCompany?.pointsOfSale.length}
              </p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-info-soft text-info">
              <SlidersHorizontal className="size-4" />
            </span>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, documento, cargo o correo"
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="retirado">Retirados</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={posFilter} onValueChange={setPosFilter}>
                <SelectTrigger className="w-full lg:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los puntos</SelectItem>
                  {currentCompany?.pointsOfSale.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="w-full lg:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los contratos</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="fijo">Término fijo</SelectItem>
                  <SelectItem value="obra-labor">Obra o labor</SelectItem>
                  <SelectItem value="prestacion-servicios">
                    Prestación de servicios
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 hidden rounded-xl border border-border lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Empleado</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Punto de venta</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead className="text-right">
                    Salario y auxilio
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[60px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee) => (
                  <TableRow
                    key={employee.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(employee)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <EmployeeAvatar
                          firstName={employee.firstName}
                          lastName={employee.lastName}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {fullName(employee)}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{employee.position}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {employee.department}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {currentCompany?.pointsOfSale.find(
                        (pos) => pos.id === employee.pointOfSaleId,
                      )?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={employee.contractType} />
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm font-medium">
                        {formatCOP(employee.salary)}
                      </p>
                      {currentCompany &&
                      transportAllowanceFor(employee, currentCompany) > 0 ? (
                        <>
                          <p className="text-[10px] text-muted-foreground">
                            + auxilio{" "}
                            {formatCOP(
                              transportAllowanceFor(employee, currentCompany),
                            )}
                          </p>
                          <p className="text-[11px] font-semibold text-foreground">
                            {formatCOP(
                              monthlyCompensation(employee, currentCompany),
                            )}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">
                          Sin auxilio
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={employee.status} />
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Acciones de ${fullName(employee)}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelected(employee)}>
                            <Eye className="mr-2 size-4" /> Ver ficha
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(employee);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 size-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {employee.status === "activo" ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setRetireTarget(employee);
                                setRetireReason(
                                  employee.terminationReason || "renuncia",
                                );
                                setRetireDate(
                                  employee.endDate ||
                                    new Date().toISOString().slice(0, 10),
                                );
                              }}
                            >
                              <UserMinus className="mr-2 size-4" /> Retirar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                void reactivateEmployee(employee.id)
                              }
                            >
                              <UserCheck className="mr-2 size-4" /> Eliminar
                              retiro
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(employee)}
                          >
                            <Trash2 className="mr-2 size-4" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Users}
                  title="Sin resultados"
                  description="Ajusta los filtros o agrega un nuevo empleado a la plantilla."
                  action={
                    <Button
                    size="sm"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-3.5" /> Nuevo empleado
                  </Button>
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="mt-4 space-y-2 lg:hidden">
            {filtered.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => setSelected(employee)}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left"
              >
                <EmployeeAvatar
                  firstName={employee.firstName}
                  lastName={employee.lastName}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {fullName(employee)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {employee.position} ·{" "}
                    {currentCompany?.pointsOfSale.find(
                      (pos) => pos.id === employee.pointOfSaleId,
                    )?.name ?? "Sin punto"}
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    {formatCOP(
                      currentCompany
                        ? monthlyCompensation(employee, currentCompany)
                        : employee.salary,
                    )}
                    {currentCompany &&
                    transportAllowanceFor(employee, currentCompany) > 0 ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        (incluye auxilio)
                      </span>
                    ) : null}
                  </p>
                </div>
                <StatusPill status={employee.status} />
              </button>
            ))}
            {filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sin resultados"
                description="Ajusta los filtros o agrega un nuevo empleado."
              />
            ) : null}
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            {filtered.length} de {companyEmployees.length} colaboradores
          </p>
        </CardContent>
      </Card>

      {currentCompany ? (
        <>
          <EmployeeFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            company={currentCompany}
            employee={editing}
            existingEmployees={companyEmployees}
          />
          <EmployeeDetailSheet
            employee={selected}
            company={currentCompany}
            open={Boolean(selected)}
            onOpenChange={(open) => !open && setSelected(null)}
            onEdit={() => {
              setEditing(selected);
              setFormOpen(true);
              setSelected(null);
            }}
            onDelete={() => {
              setDeleteTarget(selected);
              setSelected(null);
            }}
          />
        </>
      ) : null}

      <AlertDialog
        open={Boolean(retireTarget)}
        onOpenChange={(open) => !open && setRetireTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Retirar a{" "}
              {retireTarget ? fullName(retireTarget) : "este empleado"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El empleado saldrá de la plantilla activa y no se incluirá en las
              próximas nóminas. Su histórico de pagos y documentos se conserva.
              Te llevaremos a su liquidación final para calcular vacaciones,
              cesantías, intereses y prima.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Motivo del retiro
              </Label>
              <Select value={retireReason} onValueChange={setRetireReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renuncia">Renuncia voluntaria</SelectItem>
                  <SelectItem value="mutuo-acuerdo">
                    Mutuo acuerdo
                  </SelectItem>
                  <SelectItem value="despido-sin-justa-causa">
                    Despido sin justa causa
                  </SelectItem>
                  <SelectItem value="despido-con-justa-causa">
                    Despido con justa causa
                  </SelectItem>
                  <SelectItem value="vencimiento-plazo">
                    Vencimiento del plazo
                  </SelectItem>
                  <SelectItem value="fin-obra">Fin de obra o labor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Fecha de retiro
              </Label>
              <Input
                type="date"
                value={retireDate}
                onChange={(event) => setRetireDate(event.target.value)}
              />
            </div>
            {retireReason === "despido-sin-justa-causa" ? (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-[11px] text-warning">
                Se incluirá la indemnización del artículo 64 del C.S.T. en la
                liquidación final.
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!retireTarget) return;
                const target = retireTarget;
                await retireEmployee(target.id, {
                  endDate: retireDate,
                  reason: retireReason,
                });
                setRetireTarget(null);
                if (target.contractType !== "prestacion-servicios") {
                  navigate(`/liquidaciones?empleado=${target.id}`);
                }
              }}
            >
              Retirar y liquidar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar a{" "}
              {deleteTarget ? fullName(deleteTarget) : "este empleado"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán también sus nóminas, ausencias y documentos
              asociados. Esta acción no se puede deshacer. Si solo deseas
              sacarlo de la nómina, usa <strong>Retirar</strong> en su ficha.
              Si tenía cuenta de acceso, revócala desde Usuarios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  void deleteEmployee(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Eliminar empleado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
