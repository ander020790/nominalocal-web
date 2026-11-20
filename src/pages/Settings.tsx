import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Coins,
  FileSignature,
  ImageUp,
  Plus,
  Save,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { readLogoFile, readSignatureFile } from "@/lib/signature";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RutUpload } from "@/components/companies/rut-upload";
import { useApp } from "@/context/app-context-value";
import { DOCUMENT_LABELS } from "@/lib/documents";
import { formatCOP } from "@/lib/format";
import type { PayrollParams, SalaryConcept } from "@/data/types";

const percentageFields: {
  key: keyof PayrollParams;
  label: string;
  group: string;
}[] = [
  { key: "healthEmployee", label: "Salud empleado", group: "Deducciones" },
  { key: "pensionEmployee", label: "Pensión empleado", group: "Deducciones" },
  { key: "healthEmployer", label: "Salud empleador", group: "Aportes" },
  { key: "pensionEmployer", label: "Pensión empleador", group: "Aportes" },
  { key: "compensationFund", label: "Caja de compensación", group: "Aportes" },
  { key: "sena", label: "SENA", group: "Aportes" },
  { key: "icbf", label: "ICBF", group: "Aportes" },
  { key: "cesantias", label: "Cesantías", group: "Provisiones" },
  {
    key: "interestCesantias",
    label: "Intereses sobre cesantías",
    group: "Provisiones",
  },
  { key: "prima", label: "Prima de servicios", group: "Provisiones" },
  { key: "vacaciones", label: "Vacaciones", group: "Provisiones" },
  { key: "nightSurcharge", label: "Recargo nocturno", group: "Recargos" },
  { key: "extraDaySurcharge", label: "Hora extra diurna", group: "Recargos" },
  { key: "extraNightSurcharge", label: "Hora extra nocturna", group: "Recargos" },
  {
    key: "sundayHolidaySurcharge",
    label: "Dominical y festivo",
    group: "Recargos",
  },
];

const toPercent = (value: number) =>
  Number((value * 100).toFixed(3)).toString();

export const Settings = () => {
  const {
    currentCompany,
    companyEmployees,
    updateCompany,
    applyAnnualParameters,
    addConcept,
    removeConcept,
  } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    nit: "",
    city: "",
    department: "",
    address: "",
    phone: "",
    email: "",
    legalRep: "",
    legalRepDoc: "",
    clauses: "",
    economicActivity: "",
    taxResponsibilities: "",
    signatureData: "",
    logoData: "",
    letterheadCode: "GH-FOR-01",
    letterheadVersion: "01",
    letterheadValidity: "",
    payrollBank: "Bancolombia",
    payrollAccountType: "S" as "S" | "D",
    payrollAccountNumber: "",
  });
  const [params, setParams] = useState<Record<string, string>>({});
  const [templateClauses, setTemplateClauses] = useState<
    Record<string, string>
  >({});
  const [exonerated, setExonerated] = useState(true);
  const [annualOpen, setAnnualOpen] = useState(false);
  const [annualForm, setAnnualForm] = useState({
    smmlv: 0,
    transportAllowance: 0,
    uvt: 0,
    raiseSmmlvSalaries: true,
  });
  const [posOpen, setPosOpen] = useState(false);
  const [conceptOpen, setConceptOpen] = useState(false);
  const [newPos, setNewPos] = useState({
    name: "",
    city: "",
    address: "",
    manager: "",
  });
  const [newConcept, setNewConcept] = useState<SalaryConcept>({
    id: "",
    name: "",
    type: "earning",
    kind: "variable",
    taxable: true,
    cotizable: true,
    prestacional: true,
  });

  useEffect(() => {
    if (!currentCompany) return;
    setForm({
      name: currentCompany.name,
      nit: currentCompany.nit,
      city: currentCompany.city,
      department: currentCompany.department ?? "",
      address: currentCompany.address,
      phone: currentCompany.phone,
      email: currentCompany.email,
      legalRep: currentCompany.legalRep,
      legalRepDoc: currentCompany.legalRepDoc,
      clauses: currentCompany.clauses ?? "",
      economicActivity: currentCompany.economicActivity ?? "",
      taxResponsibilities: currentCompany.taxResponsibilities ?? "",
      signatureData: currentCompany.signatureData ?? "",
      logoData: currentCompany.logoData ?? "",
      letterheadCode: currentCompany.letterheadCode ?? "GH-FOR-01",
      letterheadVersion: currentCompany.letterheadVersion ?? "01",
      letterheadValidity: currentCompany.letterheadValidity ?? "",
      payrollBank: currentCompany.payrollBank ?? "Bancolombia",
      payrollAccountType: currentCompany.payrollAccountType ?? "S",
      payrollAccountNumber: currentCompany.payrollAccountNumber ?? "",
    });
    setTemplateClauses(
      (currentCompany.templateClauses ?? {}) as Record<string, string>,
    );
    setExonerated(currentCompany.params.exonerated);
    const nextParams: Record<string, string> = {};
    percentageFields.forEach((field) => {
      nextParams[field.key] = toPercent(
        Number(currentCompany.params[field.key]),
      );
    });
    (
      [
        "smmlv",
        "transportAllowance",
        "motoAllowance",
        "uvt",
        "year",
        "weeklyHours",
        "nightStartHour",
        "solidarityThreshold",
        "solidarityRate",
      ] as const
    ).forEach((key) => {
      const value = currentCompany.params[key];
      nextParams[key] = value === undefined || value === null ? "" : String(value);
    });
    (["I", "II", "III", "IV", "V"] as const).forEach((level) => {
      nextParams[`arl-${level}`] = toPercent(currentCompany.params.arl[level]);
    });
    setParams(nextParams);
  }, [currentCompany]);

  if (!currentCompany) return null;

  const saveCompany = () => {
    updateCompany(currentCompany.id, { ...form });
  };

  const saveTemplates = () => {
    updateCompany(currentCompany.id, {
      templateClauses: templateClauses as Partial<
        Record<keyof typeof DOCUMENT_LABELS, string>
      >,
    });
  };

  const saveParams = () => {
    const toValue = (key: string) => Number(params[key] ?? 0) / 100;
    const num = (key: string, fallback = 0) => {
      const value = Number(params[key]);
      return Number.isFinite(value) ? value : fallback;
    };
    const next: PayrollParams = {
      ...currentCompany.params,
      smmlv: num("smmlv", currentCompany.params.smmlv),
      transportAllowance: num(
        "transportAllowance",
        currentCompany.params.transportAllowance,
      ),
      motoAllowance: num("motoAllowance", currentCompany.params.motoAllowance ?? 0),
      uvt: num("uvt", currentCompany.params.uvt),
      year: num("year", currentCompany.params.year),
      weeklyHours: num("weeklyHours", currentCompany.params.weeklyHours),
      nightStartHour: num("nightStartHour", currentCompany.params.nightStartHour),
      solidarityThreshold: num(
        "solidarityThreshold",
        currentCompany.params.solidarityThreshold,
      ),
      solidarityRate: num("solidarityRate", currentCompany.params.solidarityRate),
      exonerated,
      arl: {
        I: toValue("arl-I"),
        II: toValue("arl-II"),
        III: toValue("arl-III"),
        IV: toValue("arl-IV"),
        V: toValue("arl-V"),
      },
    };
    percentageFields.forEach((field) => {
      (next[field.key] as number) = toValue(field.key);
    });
    updateCompany(currentCompany.id, { params: next });
  };

  const groups = Array.from(
    new Set(percentageFields.map((field) => field.group)),
  );

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={`${currentCompany.name} · NIT ${currentCompany.nit}`}
        title="Ajustes de la empresa"
        description="Cada empresa es independiente y parametrizable: estos valores solo afectan a esta compañía y a los cálculos nuevos."
      />

      {currentCompany.params.year < new Date().getFullYear() ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Actualización anual pendiente
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Los parámetros están en {currentCompany.params.year}. Actualízalos
              a {new Date().getFullYear()} con el SMLMV, auxilio y UVT aprobados.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setAnnualForm({
                smmlv: currentCompany.params.smmlv,
                transportAllowance: currentCompany.params.transportAllowance,
                uvt: currentCompany.params.uvt,
                raiseSmmlvSalaries: true,
              });
              setAnnualOpen(true);
            }}
          >
            Actualizar a {new Date().getFullYear()}
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/60 p-1">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="size-3.5" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="parametros" className="gap-2">
            <Coins className="size-3.5" /> Parámetros de nómina
          </TabsTrigger>
          <TabsTrigger value="puntos" className="gap-2">
            <Store className="size-3.5" /> Puntos de venta
          </TabsTrigger>
          <TabsTrigger value="conceptos" className="gap-2">
            <FileSignature className="size-3.5" /> Conceptos
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="gap-2">
            <FileSignature className="size-3.5" /> Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Datos legales
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Se usan en los contratos, pagarés, políticas y recibos de nómina.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  }))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Razón social">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="NIT">
                  <Input
                    value={form.nit}
                    onChange={(e) => setForm({ ...form, nit: e.target.value })}
                  />
                </Field>
                <Field label="Ciudad">
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </Field>
                <Field label="Departamento">
                  <Input
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                  />
                </Field>
                <Field label="Dirección">
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Field>
                <Field label="Actividad económica">
                  <Input
                    value={form.economicActivity}
                    onChange={(e) =>
                      setForm({ ...form, economicActivity: e.target.value })
                    }
                    placeholder="Código y descripción"
                  />
                </Field>
                <Field label="Responsabilidades tributarias">
                  <Input
                    value={form.taxResponsibilities}
                    onChange={(e) =>
                      setForm({ ...form, taxResponsibilities: e.target.value })
                    }
                    placeholder="Responsable de IVA, Agente de retención"
                  />
                </Field>
                <Field label="Teléfono">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="Correo">
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Representante legal">
                  <Input
                    value={form.legalRep}
                    onChange={(e) =>
                      setForm({ ...form, legalRep: e.target.value })
                    }
                  />
                </Field>
                <Field label="Documento del representante">
                  <Input
                    value={form.legalRepDoc}
                    onChange={(e) =>
                      setForm({ ...form, legalRepDoc: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ImageUp className="size-4 text-primary" /> Logo y membrete
                      de los documentos
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      El logo se usa en el encabezado y como marca de agua de
                      todos los PDF: contratos, pagaré, política de ventas,
                      certificados, recibos de nómina, liquidaciones y
                      plantillas. Usa PNG con fondo transparente.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent">
                      <ImageUp className="size-3.5" />
                      Subir logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          try {
                            const dataUrl = await readLogoFile(file);
                            setForm((current) => ({
                              ...current,
                              logoData: dataUrl,
                            }));
                            toast.success(
                              "Logo cargado. Pulsa Guardar datos para aplicarlo.",
                            );
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "No pudimos cargar el logo.",
                            );
                          }
                        }}
                      />
                    </label>
                    {form.logoData ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setForm((current) => ({ ...current, logoData: "" }))
                        }
                      >
                        <Trash2 className="size-3.5" /> Quitar
                      </Button>
                    ) : null}
                  </div>
                </div>

                {form.logoData ? (
                  <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-card p-4">
                    <img
                      src={form.logoData}
                      alt="Logo de la empresa"
                      className="max-h-20 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                    Sin logo cargado. El encabezado mostrará el nombre de la
                    empresa.
                  </p>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Field label="Código del formato">
                    <Input
                      value={form.letterheadCode}
                      onChange={(e) =>
                        setForm({ ...form, letterheadCode: e.target.value })
                      }
                      placeholder="GH-FOR-01"
                    />
                  </Field>
                  <Field label="Versión">
                    <Input
                      value={form.letterheadVersion}
                      onChange={(e) =>
                        setForm({ ...form, letterheadVersion: e.target.value })
                      }
                      placeholder="01"
                    />
                  </Field>
                  <Field label="Vigencia">
                    <Input
                      value={form.letterheadValidity}
                      onChange={(e) =>
                        setForm({ ...form, letterheadValidity: e.target.value })
                      }
                      placeholder="Nov / 2026"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ImageUp className="size-4 text-primary" /> Firma del
                      representante legal
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Se incluirá en contratos, pagaré, acuerdo de
                      confidencialidad, política de ventas, certificados
                      laborales y recibos de nómina. Usa PNG con fondo
                      transparente.
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent">
                      <ImageUp className="size-3.5" />
                      Subir firma
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          try {
                            const dataUrl = await readSignatureFile(file);
                            setForm((current) => ({
                              ...current,
                              signatureData: dataUrl,
                            }));
                            toast.success(
                              "Firma cargada. Pulsa Guardar datos para aplicarla.",
                            );
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "No pudimos cargar la firma.",
                            );
                          }
                        }}
                      />
                    </label>
                    {form.signatureData ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            signatureData: "",
                          }))
                        }
                      >
                        <Trash2 className="size-3.5" /> Quitar
                      </Button>
                    ) : null}
                  </div>
                </div>

                {form.signatureData ? (
                  <div className="mt-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-card p-4">
                    <img
                      src={form.signatureData}
                      alt="Firma del representante legal"
                      className="max-h-24 w-auto object-contain"
                    />
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                    Sin firma cargada. Los documentos mostrarán el espacio para
                    firmar a mano.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Cuenta para pagar la nómina
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Se usa para generar el archivo plano PAB de Bancolombia. Los
                  abonos se hacen a las cuentas de los empleados registradas en
                  su ficha.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Banco">
                    <Input
                      value={form.payrollBank}
                      onChange={(e) =>
                        setForm({ ...form, payrollBank: e.target.value })
                      }
                      placeholder="Bancolombia"
                    />
                  </Field>
                  <Field label="Tipo de cuenta">
                    <Select
                      value={form.payrollAccountType}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          payrollAccountType: value as "S" | "D",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">Ahorros</SelectItem>
                        <SelectItem value="D">Corriente</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Número de cuenta">
                    <Input
                      value={form.payrollAccountNumber}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          payrollAccountNumber: e.target.value,
                        })
                      }
                      placeholder="000-123456-78"
                    />
                  </Field>
                </div>
              </div>

              <Field label="Cláusula adicional para los contratos">
                <Textarea
                  rows={3}
                  value={form.clauses}
                  onChange={(e) => setForm({ ...form, clauses: e.target.value })}
                  placeholder="Texto que se añade como cláusula adicional en los contratos de esta empresa."
                />
              </Field>
              <div className="flex justify-end">
                <Button onClick={saveCompany}>
                  <Save className="size-4" /> Guardar datos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parametros" className="space-y-4">
          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Bases y límites del año
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Valores vigentes {currentCompany.params.year}. Los cambios no
                alteran nóminas ya cerradas.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Año de parámetros">
                  <Input
                    type="number"
                    value={params.year ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, year: e.target.value })
                    }
                  />
                </Field>
                <Field label="SMMLV">
                  <Input
                    type="number"
                    value={params.smmlv ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, smmlv: e.target.value })
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatCOP(Number(params.smmlv ?? 0))}
                  </p>
                </Field>
                <Field label="Auxilio de transporte">
                  <Input
                    type="number"
                    value={params.transportAllowance ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, transportAllowance: e.target.value })
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatCOP(Number(params.transportAllowance ?? 0))}
                  </p>
                </Field>
                <Field label="Auxilio de moto">
                  <Input
                    type="number"
                    value={params.motoAllowance ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, motoAllowance: e.target.value })
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatCOP(Number(params.motoAllowance ?? 0))}
                  </p>
                </Field>
                <Field label="UVT">
                  <Input
                    type="number"
                    value={params.uvt ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, uvt: e.target.value })
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {formatCOP(Number(params.uvt ?? 0))}
                  </p>
                </Field>
                <Field label="Jornada semanal (horas)">
                  <Input
                    type="number"
                    value={params.weeklyHours ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, weeklyHours: e.target.value })
                    }
                  />
                </Field>
                <Field label="Inicio jornada nocturna (hora)">
                  <Input
                    type="number"
                    value={params.nightStartHour ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, nightStartHour: e.target.value })
                    }
                  />
                </Field>
                <Field label="Umbral solidaridad (SMMLV)">
                  <Input
                    type="number"
                    value={params.solidarityThreshold ?? ""}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        solidarityThreshold: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Tarifa solidaridad (decimal)">
                  <Input
                    value={params.solidarityRate ?? ""}
                    onChange={(e) =>
                      setParams({ ...params, solidarityRate: e.target.value })
                    }
                  />
                </Field>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-3">
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Aplicar exoneración de aportes
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Salud, SENA e ICBF a cargo del empleador cuando aplica la
                    exoneración legal.
                  </span>
                </span>
                <Switch checked={exonerated} onCheckedChange={setExonerated} />
              </label>

              {groups.map((group) => (
                <div key={group}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group} (%)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {percentageFields
                      .filter((field) => field.group === group)
                      .map((field) => (
                        <Field key={field.key} label={field.label}>
                          <Input
                            value={params[field.key] ?? ""}
                            onChange={(e) =>
                              setParams({
                                ...params,
                                [field.key]: e.target.value,
                              })
                            }
                          />
                        </Field>
                      ))}
                  </div>
                </div>
              ))}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ARL por nivel de riesgo (%)
                </p>
                <div className="grid gap-3 sm:grid-cols-5">
                  {(["I", "II", "III", "IV", "V"] as const).map((level) => (
                    <Field key={level} label={`Nivel ${level}`}>
                      <Input
                        value={params[`arl-${level}`] ?? ""}
                        onChange={(e) =>
                          setParams({
                            ...params,
                            [`arl-${level}`]: e.target.value,
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveParams}>
                  <Save className="size-4" /> Guardar parámetros
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="puntos" className="space-y-4">
          <Card className="surface-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="font-display text-base font-semibold">
                  Puntos de venta
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Canales autorizados para la venta de mercancía. Se usan en los
                  contratos y en la asignación de empleados.
                </p>
              </div>
              <Button size="sm" onClick={() => setPosOpen(true)}>
                <Plus className="size-3.5" /> Agregar
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentCompany.pointsOfSale.map((pos) => (
                <div
                  key={pos.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {pos.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {pos.address}, {pos.city}
                      {pos.phone ? ` · Tel. ${pos.phone}` : ""} · Responsable{" "}
                      {pos.manager || "sin asignar"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {
                        companyEmployees.filter(
                          (employee) =>
                            employee.pointOfSaleId === pos.id &&
                            employee.status === "activo",
                        ).length
                      }{" "}
                      empleados
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        updateCompany(currentCompany.id, {
                          pointsOfSale: currentCompany.pointsOfSale.filter(
                            (item) => item.id !== pos.id,
                          ),
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conceptos" className="space-y-4">
          <Card className="surface-card border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="font-display text-base font-semibold">
                  Catálogo de conceptos
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Devengos y deducciones disponibles al liquidar la nómina.
                </p>
              </div>
              <Button size="sm" onClick={() => setConceptOpen(true)}>
                <Plus className="size-3.5" /> Agregar concepto
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Concepto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Naturaleza</TableHead>
                      <TableHead>Tratamiento</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentCompany.concepts.map((concept) => (
                      <TableRow key={concept.id}>
                        <TableCell className="text-sm font-medium">
                          {concept.name}
                        </TableCell>
                        <TableCell className="text-xs capitalize text-muted-foreground">
                          {concept.type === "earning" ? "Devengo" : "Deducción"}
                        </TableCell>
                        <TableCell className="text-xs capitalize text-muted-foreground">
                          {concept.kind}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {[
                            concept.taxable ? "Gravable" : "No gravable",
                            concept.cotizable ? "Cotizable" : "No cotizable",
                            concept.prestacional ? "Prestacional" : "No prestacional",
                          ].join(" · ")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeConcept(concept.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plantillas" className="space-y-4">
          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Plantillas de documentos
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Modelos base de Colombia que se completan con la ficha del
                empleado y la cláusula adicional configurada para esta empresa.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(DOCUMENT_LABELS).map(([kind, label]) => (
                  <div
                    key={kind}
                    className="space-y-2 rounded-xl border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {label}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Cláusula adicional de esta empresa
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() =>
                          navigate(`/documentos?plantilla=${kind}`)
                        }
                      >
                        Usar
                      </Button>
                    </div>
                    <Textarea
                      rows={3}
                      value={templateClauses[kind] ?? ""}
                      onChange={(event) =>
                        setTemplateClauses((current) => ({
                          ...current,
                          [kind]: event.target.value,
                        }))
                      }
                      placeholder="Texto que se añadirá a este documento. Puedes editarlo también al generarlo."
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  El texto se carga automáticamente al generar el documento y
                  puede ajustarse antes de descargarlo.
                </p>
                <Button onClick={saveTemplates}>
                  <Save className="size-4" /> Guardar cláusulas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={posOpen} onOpenChange={setPosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Nuevo punto de venta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nombre">
              <Input
                value={newPos.name}
                onChange={(e) =>
                  setNewPos({ ...newPos, name: e.target.value })
                }
                placeholder="Punto Chapinero"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ciudad">
                <Input
                  value={newPos.city}
                  onChange={(e) =>
                    setNewPos({ ...newPos, city: e.target.value })
                  }
                />
              </Field>
              <Field label="Responsable">
                <Input
                  value={newPos.manager}
                  onChange={(e) =>
                    setNewPos({ ...newPos, manager: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Dirección">
              <Input
                value={newPos.address}
                onChange={(e) =>
                  setNewPos({ ...newPos, address: e.target.value })
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!newPos.name) return;
                updateCompany(currentCompany.id, {
                  pointsOfSale: [
                    ...currentCompany.pointsOfSale,
                    { ...newPos, id: `ps-${Date.now()}` },
                  ],
                });
                setNewPos({ name: "", city: "", address: "", manager: "" });
                setPosOpen(false);
              }}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conceptOpen} onOpenChange={setConceptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Nuevo concepto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nombre">
              <Input
                value={newConcept.name}
                onChange={(e) =>
                  setNewConcept({ ...newConcept, name: e.target.value })
                }
                placeholder="Bono de productividad"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <Select
                  value={newConcept.type}
                  onValueChange={(value) =>
                    setNewConcept({
                      ...newConcept,
                      type: value as SalaryConcept["type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Devengo</SelectItem>
                    <SelectItem value="deduction">Deducción</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Naturaleza">
                <Select
                  value={newConcept.kind}
                  onValueChange={(value) =>
                    setNewConcept({
                      ...newConcept,
                      kind: value as SalaryConcept["kind"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fijo">Fijo</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="space-y-2 rounded-lg border border-border p-3">
              <label className="flex items-center justify-between text-xs text-foreground">
                Gravable
                <Switch
                  checked={newConcept.taxable}
                  onCheckedChange={(value) =>
                    setNewConcept({ ...newConcept, taxable: value })
                  }
                />
              </label>
              <label className="flex items-center justify-between text-xs text-foreground">
                Cotizable
                <Switch
                  checked={newConcept.cotizable}
                  onCheckedChange={(value) =>
                    setNewConcept({ ...newConcept, cotizable: value })
                  }
                />
              </label>
              <label className="flex items-center justify-between text-xs text-foreground">
                Prestacional
                <Switch
                  checked={newConcept.prestacional}
                  onCheckedChange={(value) =>
                    setNewConcept({ ...newConcept, prestacional: value })
                  }
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConceptOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!newConcept.name) return;
                addConcept(newConcept);
                setNewConcept({
                  id: "",
                  name: "",
                  type: "earning",
                  kind: "variable",
                  taxable: true,
                  cotizable: true,
                  prestacional: true,
                });
                setConceptOpen(false);
              }}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={annualOpen} onOpenChange={setAnnualOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Actualizar parámetros {new Date().getFullYear()}
            </DialogTitle>
            <DialogDescription>
              Ingresa los valores aprobados por el Gobierno Nacional. Se
              aplicarán a los cálculos de esta empresa desde ahora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  SMLMV mensual
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={annualForm.smmlv || ""}
                  onChange={(event) =>
                    setAnnualForm((current) => ({
                      ...current,
                      smmlv: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Auxilio de transporte
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={annualForm.transportAllowance || ""}
                  onChange={(event) =>
                    setAnnualForm((current) => ({
                      ...current,
                      transportAllowance: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                UVT
              </Label>
              <Input
                type="number"
                min={0}
                value={annualForm.uvt || ""}
                onChange={(event) =>
                  setAnnualForm((current) => ({
                    ...current,
                    uvt: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-[11px] text-muted-foreground">
              <Checkbox
                checked={annualForm.raiseSmmlvSalaries}
                onCheckedChange={(value) =>
                  setAnnualForm((current) => ({
                    ...current,
                    raiseSmmlvSalaries: Boolean(value),
                  }))
                }
              />
              <span>
                <span className="font-medium text-foreground">
                  Ajustar automáticamente los salarios que estaban en el SMLMV
                  anterior
                </span>
                <br />
                Se actualizarán al nuevo SMLMV, según la cláusula de
                actualización salarial.
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnualOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={annualForm.smmlv <= 0}
              onClick={async () => {
                await applyAnnualParameters({
                  year: new Date().getFullYear(),
                  smmlv: annualForm.smmlv,
                  transportAllowance: annualForm.transportAllowance,
                  uvt: annualForm.uvt,
                  raiseSmmlvSalaries: annualForm.raiseSmmlvSalaries,
                });
                setAnnualOpen(false);
              }}
            >
              Aplicar parámetros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);
