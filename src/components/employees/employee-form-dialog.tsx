import { useEffect, useState } from "react";
import { Briefcase, Landmark, UserRound } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useApp } from "@/context/app-context-value";
import { formatCOP } from "@/lib/format";
import type { Company, Employee } from "@/data/types";

const emptyForm = {
  firstName: "",
  lastName: "",
  docType: "CC" as Employee["docType"],
  docNumber: "",
  birthDate: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  position: "",
  department: "Ventas",
  pointOfSaleId: "",
  contractType: "indefinido" as Employee["contractType"],
  startDate: new Date().toISOString().slice(0, 10),
  salary: 1_750_905,
  integralSalary: false,
  motoAllowance: false,
  transportAllowance: true,
  riskLevel: "I" as Employee["riskLevel"],
  eps: "",
  pensionFund: "",
  arlProvider: "",
  compensationFund: "",
  bank: "Bancolombia",
  accountType: "ahorros" as "ahorros" | "corriente",
  accountNumber: "",
  fixedEarnings: [] as Employee["fixedEarnings"],
  fixedDeductions: [] as Employee["fixedDeductions"],
};

const departments = [
  "Ventas",
  "Operaciones",
  "Logística",
  "Administración",
  "Mercadeo",
  "Dirección",
];

const riskLabels: Record<string, string> = {
  I: "Nivel I · Oficina (0,522%)",
  II: "Nivel II · Comercio (1,044%)",
  III: "Nivel III · Bodega (2,436%)",
  IV: "Nivel IV · Construcción (4,35%)",
  V: "Nivel V · Alto riesgo (6,96%)",
};

export const EmployeeFormDialog = ({
  open,
  onOpenChange,
  company,
  employee,
  existingEmployees = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
  employee?: Employee | null;
  existingEmployees?: Employee[];
}) => {
  const { addEmployee, updateEmployee, createCompanyUser } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError("");
    setBusy(false);
    if (employee) {
      setForm({
        firstName: employee.firstName,
        lastName: employee.lastName,
        docType: employee.docType,
        docNumber: employee.docNumber,
        birthDate: employee.birthDate,
        email: employee.email,
        phone: employee.phone,
        address: employee.address,
        city: employee.city,
        position: employee.position,
        department: employee.department,
        pointOfSaleId: employee.pointOfSaleId ?? "",
        contractType: employee.contractType,
        startDate: employee.startDate,
        salary: employee.salary,
        integralSalary: employee.integralSalary,
        motoAllowance: employee.motoAllowance ?? false,
        transportAllowance: employee.transportAllowance,
        riskLevel: employee.riskLevel,
        eps: employee.eps,
        pensionFund: employee.pensionFund,
        arlProvider: employee.arlProvider,
        compensationFund: employee.compensationFund,
        bank: employee.bank,
        accountType: employee.accountType,
        accountNumber: employee.accountNumber,
        fixedEarnings: employee.fixedEarnings ?? [],
        fixedDeductions: employee.fixedDeductions ?? [],
      });
    } else {
      setForm({ ...emptyForm, city: company.city });
    }
  }, [open, employee, company.city]);

  const allowancePreview =
    form.transportAllowance &&
    !form.integralSalary &&
    form.salary <= company.params.smmlv * 2
      ? company.params.transportAllowance
      : 0;

  const set = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (busy) return;
    setFormError("");
    if (!form.firstName || !form.lastName || !form.docNumber || !form.position) {
      setFormError("Completa nombres, apellidos, documento y cargo.");
      return;
    }
    const digits = form.docNumber.replace(/\D/g, "");
    const duplicate = existingEmployees.some(
      (item) =>
        item.id !== employee?.id &&
        item.status === "activo" &&
        item.docNumber.replace(/\D/g, "") === digits,
    );
    if (digits && duplicate) {
      setFormError("Ya existe un empleado activo con ese documento.");
      return;
    }
    const invalidEarning = form.fixedEarnings.some(
      (item) =>
        !item.label.trim() ||
        !Number.isFinite(item.amount) ||
        item.amount <= 0,
    );

    if (invalidEarning) {
      setFormError(
        "Cada ingreso fijo debe tener un nombre y un valor mayor que cero.",
      );
      return;
    }

    const invalidDeduction = form.fixedDeductions.some(
      (item) =>
        !item.label.trim() ||
        !Number.isFinite(item.amount) ||
        item.amount <= 0,
    );

    if (invalidDeduction) {
      setFormError(
        "Cada descuento fijo debe tener un nombre y un valor mayor que cero.",
      );
      return;
    }

    const payload = {
      ...form,
      fixedEarnings: form.fixedEarnings.map((item) => ({
        ...item,
        label: item.label.trim(),
      })),
      fixedDeductions: form.fixedDeductions.map((item) => ({
        ...item,
        label: item.label.trim(),
      })),
      pointOfSaleId: form.pointOfSaleId || null,
    };
    setBusy(true);
    try {
      if (employee) {
        const saved = await updateEmployee(employee.id, payload);
        if (!saved) {
          setFormError("No pudimos guardar el empleado. Revisa los datos.");
          return;
        }
        onOpenChange(false);
        return;
      }

      const created = await addEmployee(payload);
      if (!created) {
        setFormError("No pudimos guardar el empleado. Revisa los datos.");
        return;
      }

      if (created.email) {
        const account = await createCompanyUser({
          companyId: company.id,
          role: "employee",
          name: `${created.firstName} ${created.lastName}`,
          email: created.email,
          employeeId: created.id,
        });
        if (account?.password) {
          toast.success("Cuenta del portal creada", {
            description: `Correo: ${account.email} · Clave inicial: ${account.password}`,
          });
        } else if (account) {
          toast.info(
            "La cuenta ya existía y quedó vinculada al empleado. Usa su clave actual.",
          );
        } else {
          toast.warning(
            "El empleado quedó creado, pero su cuenta del portal no se pudo asignar.",
          );
        }
      } else {
        toast.info(
          "Empleado creado sin cuenta del portal. Agrega un correo para generarla.",
        );
      }

      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="font-display text-lg">
            {employee ? "Editar ficha del empleado" : "Nuevo empleado"}
          </DialogTitle>
          <DialogDescription>
            Los datos alimentan la nómina, los contratos y los documentos de la
            empresa {company.name}. Al guardar un empleado nuevo se crea su
            cuenta del portal con el correo indicado y la cédula como clave
            inicial.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh] px-6 py-5">
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <UserRound className="size-3.5 text-primary" /> Datos personales
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombres *">
                  <Input
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    placeholder="Camila"
                  />
                </Field>
                <Field label="Apellidos *">
                  <Input
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    placeholder="Torres"
                  />
                </Field>
                <Field label="Tipo de documento">
                  <Select
                    value={form.docType}
                    onValueChange={(v) => set("docType", v as Employee["docType"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
                      <SelectItem value="CE">Cédula de extranjería</SelectItem>
                      <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Número de documento *">
                  <Input
                    value={form.docNumber}
                    onChange={(e) => set("docNumber", e.target.value)}
                    placeholder="1.020.884.512"
                  />
                </Field>
                <Field label="Fecha de nacimiento">
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => set("birthDate", e.target.value)}
                  />
                </Field>
                <Field label="Correo electrónico">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="nombre@empresa.co"
                  />
                </Field>
                <Field label="Teléfono">
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+57 320 000 0000"
                  />
                </Field>
                <Field label="Ciudad">
                  <Input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </Field>
                <Field label="Dirección" className="sm:col-span-2">
                  <Input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Calle 93 # 15-20"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Briefcase className="size-3.5 text-primary" /> Vinculación
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cargo *">
                  <Input
                    value={form.position}
                    onChange={(e) => set("position", e.target.value)}
                    placeholder="Asesora comercial"
                  />
                </Field>
                <Field label="Área">
                  <Select
                    value={form.department}
                    onValueChange={(v) => set("department", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Punto de venta">
                  <Select
                    value={form.pointOfSaleId}
                    onValueChange={(v) => set("pointOfSaleId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      {company.pointsOfSale.map((pos) => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.name} · {pos.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tipo de contrato">
                  <Select
                    value={form.contractType}
                    onValueChange={(v) =>
                      set("contractType", v as Employee["contractType"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Término indefinido</SelectItem>
                      <SelectItem value="fijo">Término fijo</SelectItem>
                      <SelectItem value="obra-labor">Obra o labor</SelectItem>
                      <SelectItem value="prestacion-servicios">
                        Prestación de servicios
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fecha de ingreso">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                </Field>
                <Field label="Nivel de riesgo ARL">
                  <Select
                    value={form.riskLevel}
                    onValueChange={(v) =>
                      set("riskLevel", v as Employee["riskLevel"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(riskLabels).map(([level, label]) => (
                        <SelectItem key={level} value={level}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Landmark className="size-3.5 text-primary" /> Salario y
                seguridad social
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Salario básico mensual (COP) *">
                  <Input
                    type="number"
                    value={form.salary}
                    min={1_400_000}
                    step={50_000}
                    onChange={(e) => set("salary", Number(e.target.value))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Equivale a {formatCOP(form.salary)} · SMMLV{" "}
                    {formatCOP(company.params.smmlv)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Auxilio de transporte: {formatCOP(allowancePreview)} · Total
                    mensual:{" "}
                    <span className="font-semibold text-foreground">
                      {formatCOP(form.salary + allowancePreview)}
                    </span>
                  </p>
                </Field>
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                  <label className="flex items-center justify-between gap-3 text-xs font-medium text-foreground">
                    Salario integral
                    <Switch
                      checked={form.integralSalary}
                      onCheckedChange={(v) => set("integralSalary", v)}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-xs font-medium text-foreground">
                    Auxilio de transporte ({formatCOP(company.params.transportAllowance)})
                    <Switch
                      checked={form.transportAllowance}
                      onCheckedChange={(v) => set("transportAllowance", v)}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-xs font-medium text-foreground">
                    Auxilio de moto ({formatCOP(company.params.motoAllowance ?? 0)})
                    <Switch
                      checked={Boolean(form.motoAllowance)}
                      onCheckedChange={(v) => set("motoAllowance", v)}
                    />
                  </label>
                </div>
                <Field label="EPS">
                  <Input
                    value={form.eps}
                    onChange={(e) => set("eps", e.target.value)}
                    placeholder="EPS Sura"
                  />
                </Field>
                <Field label="Fondo de pensión">
                  <Input
                    value={form.pensionFund}
                    onChange={(e) => set("pensionFund", e.target.value)}
                    placeholder="Protección"
                  />
                </Field>
                <Field label="ARL">
                  <Input
                    value={form.arlProvider}
                    onChange={(e) => set("arlProvider", e.target.value)}
                    placeholder="ARL Sura"
                  />
                </Field>
                <Field label="Caja de compensación">
                  <Input
                    value={form.compensationFund}
                    onChange={(e) => set("compensationFund", e.target.value)}
                    placeholder="Compensar"
                  />
                </Field>
                <Field label="Banco">
                  <Input
                    value={form.bank}
                    onChange={(e) => set("bank", e.target.value)}
                    placeholder="Bancolombia"
                  />
                </Field>
                <Field label="Tipo de cuenta">
                  <Select
                    value={form.accountType}
                    onValueChange={(value) =>
                      set(
                        "accountType",
                        value as "ahorros" | "corriente",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ahorros">Ahorros</SelectItem>
                      <SelectItem value="corriente">Corriente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Cuenta de nómina">
                  <Input
                    value={form.accountNumber}
                    onChange={(e) => set("accountNumber", e.target.value)}
                    placeholder="000-8845-21"
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ingresos y descuentos fijos
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Ingresos fijos</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      set("fixedEarnings", [
                        ...form.fixedEarnings,
                        {
                          label: "",
                          amount: 0,
                          nature: "salarial",
                          cotizable: true,
                          prestacional: true,
                          taxable: true,
                        },
                      ])
                    }
                  >
                    Agregar ingreso
                  </Button>
                </div>

                {form.fixedEarnings.map((item, index) => (
                  <div key={index} className="space-y-3 rounded-lg border p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Concepto">
                        <Input
                          value={item.label}
                          onChange={(e) =>
                            set("fixedEarnings", form.fixedEarnings.map((entry, i) =>
                              i === index ? { ...entry, label: e.target.value } : entry
                            ))
                          }
                          placeholder="Comisión fija"
                        />
                      </Field>
                      <Field label="Valor mensual (COP)">
                        <Input
                          type="number"
                          min={0}
                          value={item.amount}
                          onChange={(e) =>
                            set("fixedEarnings", form.fixedEarnings.map((entry, i) =>
                              i === index ? { ...entry, amount: Number(e.target.value) } : entry
                            ))
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Naturaleza">
                      <Select
                        value={item.nature ?? "salarial"}
                        onValueChange={(value) => {
                          const salarial = value === "salarial";
                          set("fixedEarnings", form.fixedEarnings.map((entry, i) =>
                            i === index
                              ? {
                                  ...entry,
                                  nature: value as "salarial" | "no-salarial",
                                  cotizable: salarial,
                                  prestacional: salarial,
                                }
                              : entry
                          ));
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salarial">Salarial</SelectItem>
                          <SelectItem value="no-salarial">No salarial</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {([
                        ["cotizable", "Integra IBC"],
                        ["prestacional", "Prestacional"],
                        ["taxable", "Gravable"],
                      ] as const).map(([field, label]) => (
                        <label key={field} className="flex items-center justify-between gap-2 text-xs">
                          {label}
                          <Switch
                            checked={item[field] ?? (field === "taxable" || item.nature !== "no-salarial")}
                            onCheckedChange={(checked) =>
                              set("fixedEarnings", form.fixedEarnings.map((entry, i) =>
                                i === index ? { ...entry, [field]: checked } : entry
                              ))
                            }
                          />
                        </label>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        set("fixedEarnings", form.fixedEarnings.filter((_, i) => i !== index))
                      }
                    >
                      Eliminar ingreso
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Descuentos fijos</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      set("fixedDeductions", [
                        ...form.fixedDeductions,
                        { label: "", amount: 0, schedule: "both" },
                      ])
                    }
                  >
                    Agregar descuento
                  </Button>
                </div>

                {form.fixedDeductions.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                    <Field label="Concepto">
                      <Input
                        value={item.label}
                        onChange={(e) =>
                          set("fixedDeductions", form.fixedDeductions.map((entry, i) =>
                            i === index ? { ...entry, label: e.target.value } : entry
                          ))
                        }
                        placeholder="Libranza autorizada"
                      />
                    </Field>
                    <Field label="Valor mensual (COP)">
                      <Input
                        type="number"
                        min={0}
                        value={item.amount}
                        onChange={(e) =>
                          set("fixedDeductions", form.fixedDeductions.map((entry, i) =>
                            i === index ? { ...entry, amount: Number(e.target.value) } : entry
                          ))
                        }
                      />
                    </Field>
                    <Field label="Aplicar descuento en">
                      <select
                        value={item.schedule ?? ""}
                        onChange={(e) =>
                          set("fixedDeductions", form.fixedDeductions.map((entry, i) =>
                            i === index
                              ? {
                                  ...entry,
                                  schedule: e.target.value as "first" | "second" | "both",
                                }
                              : entry
                          ))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="" disabled>
                          Sin configurar (registro anterior)
                        </option>
                        <option value="first">Primera quincena</option>
                        <option value="second">Segunda quincena</option>
                        <option value="both">Ambas quincenas</option>
                      </select>
                    </Field>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        set("fixedDeductions", form.fixedDeductions.filter((_, i) => i !== index))
                      }
                    >
                      Eliminar descuento
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border px-6 py-4">
          {formError ? (
            <p className="mr-auto self-center text-[11px] text-destructive">
              {formError}
            </p>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy
              ? "Guardando…"
              : employee
                ? "Guardar cambios"
                : "Agregar a la plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
