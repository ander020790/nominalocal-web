import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Download,
  Eye,
  FileSignature,
  FileText,
  FileX,
  Pencil,
  Handshake,
  PenLine,
  Landmark,
  Receipt,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nextConsecutive } from "@/lib/consecutive";
import { DocumentPaper } from "@/components/documents/document-paper";
import { toast } from "sonner";
import { useApp } from "@/context/app-context-value";
import {
  buildDocument,
  contractTypeForDocument,
  DOCUMENT_LABELS,
  documentKindForContract,
  downloadDocumentPdf,
} from "@/lib/documents";
import { formatCOP, formatDate, fullName } from "@/lib/format";
import type {
  DocumentKind,
  GeneratedDocumentRecord,
} from "@/data/types";

const templates: {
  kind: DocumentKind;
  icon: typeof FileText;
  description: string;
  tone: string;
}[] = [
  {
    kind: "contrato-indefinido",
    icon: FileSignature,
    description: "Vinculación sin fecha de terminación, con periodo de prueba.",
    tone: "bg-primary-soft text-primary",
  },
  {
    kind: "contrato-fijo",
    icon: FileSignature,
    description: "Plazo determinado con prórroga y preaviso legal.",
    tone: "bg-info-soft text-info",
  },
  {
    kind: "contrato-obra-labor",
    icon: Landmark,
    description: "Duración atada a la ejecución de la obra o labor.",
    tone: "bg-warning-soft text-warning",
  },
  {
    kind: "contrato-prestacion-servicios",
    icon: Handshake,
    description: "Servicios independientes sin subordinación laboral.",
    tone: "bg-muted text-muted-foreground",
  },
  {
    kind: "pagare",
    icon: Receipt,
    description: "Título valor con monto, plazo, intereses y firma.",
    tone: "bg-success-soft text-success",
  },
  {
    kind: "confidencialidad",
    icon: ShieldCheck,
    description: "Reserva de información y devolución de soportes.",
    tone: "bg-accent-soft text-accent",
  },
  {
    kind: "politica-ventas",
    icon: Store,
    description: "Venta solo en puntos autorizados y control de caja.",
    tone: "bg-destructive-soft text-destructive",
  },
  {
    kind: "acuerdo-terminacion",
    icon: FileX,
    description:
      "Terminación por mutuo acuerdo con liquidación de acreencias y firmas.",
    tone: "bg-warning-soft text-warning",
  },
  {
    kind: "carta-renuncia",
    icon: PenLine,
    description:
      "Renuncia voluntaria del empleado con su último día laborado.",
    tone: "bg-info-soft text-info",
  },
];

export const Documents = () => {
  const {
    currentCompany,
    companyEmployees,
    companyDocuments,
    addDocument,
    setDocumentStatus,
    employeeSignatures,
  } = useApp();
  const [params, setParams] = useSearchParams();
  const preselect = params.get("empleado");
  const preselectTemplate = templates.some(
    (template) => template.kind === params.get("plantilla"),
  )
    ? (params.get("plantilla") as DocumentKind)
    : null;
  // Cada empresa ve únicamente sus propios empleados y documentos.
  const scopedEmployees = currentCompany
    ? companyEmployees.filter(
        (item) => item.companyId === currentCompany.id,
      )
    : companyEmployees;
  const scopedDocuments = currentCompany
    ? companyDocuments.filter(
        (document) => document.companyId === currentCompany.id,
      )
    : companyDocuments;

  const preselectedEmployee = scopedEmployees.find(
    (item) => item.id === preselect,
  );
  const initialKind: DocumentKind =
    preselectTemplate ??
    (preselectedEmployee
      ? preselectedEmployee.status === "retirado"
        ? "acuerdo-terminacion"
        : documentKindForContract(preselectedEmployee.contractType)
      : "contrato-indefinido");
  const defaultClauseFor = (target: DocumentKind) =>
    currentCompany?.templateClauses?.[target] ??
    (target.startsWith("contrato") ? currentCompany?.clauses ?? "" : "");
  const composeDocument = (
    base: ReturnType<typeof buildDocument>,
    clause: string,
  ) => {
    const sections = base.sections.filter(
      (section) => section.heading !== "Cláusula adicional",
    );
    return clause.trim()
      ? {
          ...base,
          sections: [
            ...sections,
            { heading: "Cláusula adicional", body: [clause.trim()] },
          ],
        }
      : { ...base, sections };
  };
  const [generateOpen, setGenerateOpen] = useState(
    Boolean(preselect || preselectTemplate),
  );
  const [kind, setKind] = useState<DocumentKind>(initialKind);
  const [extraClause, setExtraClause] = useState(() =>
    defaultClauseFor(initialKind),
  );
  const [kindTouched, setKindTouched] = useState(Boolean(preselectTemplate));
  const [employeeId, setEmployeeId] = useState(preselect ?? "");
  const [amount, setAmount] = useState(1_500_000);
  const [termMonths, setTermMonths] = useState(12);
  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [interest, setInterest] = useState(1.8);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [viewing, setViewing] = useState<GeneratedDocumentRecord | null>(null);
  const [viewingConsecutive, setViewingConsecutive] = useState<string | null>(
    null,
  );
  const [registering, setRegistering] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null,
  );

  const activeEmployees = scopedEmployees.filter(
    (employee) => employee.status === "activo",
  );
  const requiresRetirement =
    kind === "acuerdo-terminacion" || kind === "carta-renuncia";
  const retiredLaborEmployees = scopedEmployees.filter(
    (employee) =>
      employee.status === "retirado" &&
      employee.contractType !== "prestacion-servicios",
  );
  const availableEmployees = requiresRetirement
    ? retiredLaborEmployees
    : activeEmployees;
  const employee = availableEmployees.find((item) => item.id === employeeId);
  const requiredContract = requiresRetirement
    ? null
    : contractTypeForDocument(kind);
  const matchingEmployees = requiresRetirement
    ? retiredLaborEmployees
    : requiredContract
      ? activeEmployees.filter(
          (item) => item.contractType === requiredContract,
        )
      : activeEmployees;

  const content = useMemo(() => {
    if (!employee || !currentCompany) return null;
    return composeDocument(
      buildDocument(
        kind,
        { ...employee, signatureData: employeeSignatures[employee.id] },
        currentCompany,
        {
          amount,
          termMonths,
          interest,
          terminationDate,
        },
      ),
      extraClause,
    );
  }, [
    employee,
    currentCompany,
    kind,
    amount,
    termMonths,
    interest,
    terminationDate,
    extraClause,
    employeeSignatures,
  ]);

  const viewingContent = useMemo(() => {
    if (!viewing || !currentCompany) return null;
    const owner = scopedEmployees.find(
      (item) => item.id === viewing.employeeId,
    );
    if (!owner) return null;
    return composeDocument(
      buildDocument(
        viewing.kind,
        { ...owner, signatureData: employeeSignatures[owner.id] },
        currentCompany,
      ),
      viewing.clause || defaultClauseFor(viewing.kind),
    );
  }, [viewing, currentCompany, scopedEmployees, employeeSignatures]);

  const openGenerator = (templateKind?: DocumentKind) => {
    if (templateKind) {
      setKind(templateKind);
      setExtraClause(defaultClauseFor(templateKind));
      setKindTouched(true);
      if (
        templateKind === "acuerdo-terminacion" ||
        templateKind === "carta-renuncia"
      ) {
        const match =
          retiredLaborEmployees.find((item) => item.id === employeeId) ??
          retiredLaborEmployees[0];
        setEmployeeId(match?.id ?? "");
        if (match?.endDate) setTerminationDate(match.endDate);
        setGenerateOpen(true);
        return;
      }
      const required = contractTypeForDocument(templateKind);
      if (required) {
        const match =
          activeEmployees.find(
            (item) =>
              item.id === employeeId && item.contractType === required,
          ) ??
          activeEmployees.find((item) => item.contractType === required);
        setEmployeeId(match?.id ?? "");
        setGenerateOpen(true);
        return;
      }
    }

    const target = employeeId || activeEmployees[0]?.id;
    if (!employeeId && target) {
      setEmployeeId(target);
      if (!templateKind) {
        const first = activeEmployees.find((item) => item.id === target);
        if (first) {
          const assigned = documentKindForContract(first.contractType);
          setKind(assigned);
          setExtraClause(defaultClauseFor(assigned));
          setKindTouched(false);
        }
      }
    }
    setEditingDocumentId(null);
    setGenerateOpen(true);
  };

  const openEditor = (document: GeneratedDocumentRecord) => {
    setViewing(null);
    setEmployeeId(document.employeeId);
    setKind(document.kind);
    setKindTouched(true);
    setExtraClause(document.clause ?? defaultClauseFor(document.kind));
    setEditingDocumentId(document.id);
    setGenerateOpen(true);
  };

  const closeGenerator = () => {
    setGenerateOpen(false);
    setEditingDocumentId(null);
    if (params.get("empleado") || params.get("plantilla")) {
      params.delete("empleado");
      params.delete("plantilla");
      setParams(params, { replace: true });
    }
  };

  const alreadyRegistered = Boolean(
    employee &&
      scopedDocuments.some(
        (document) =>
          document.employeeId === employee.id &&
          document.kind === kind &&
          document.id !== editingDocumentId,
      ),
  );

  const register = async () => {
    if (!employee || registering) return;
    setRegistering(true);
    try {
      await addDocument({
        employeeId: employee.id,
        kind,
        title: DOCUMENT_LABELS[kind],
        status: editingDocumentId ? undefined : "generado",
        clause: extraClause,
      });
      closeGenerator();
    } finally {
      setRegistering(false);
    }
  };

  const download = async () => {
    if (!content || !employee || !currentCompany) return;
    const consecutive = await nextConsecutive(currentCompany.id, kind);
    await downloadDocumentPdf(
      content,
      `${kind}-${employee.docNumber.replace(/\s+/g, "")}.pdf`,
      currentCompany,
      consecutive,
      { signed: false },
    );
  };

  const openViewer = (document: GeneratedDocumentRecord) => {
    setViewing(document);
    setViewingConsecutive(null);
    if (!currentCompany) return;
    void nextConsecutive(currentCompany.id, document.kind)
      .then((value) => setViewingConsecutive(value))
      .catch(() => setViewingConsecutive(""));
  };

  const downloadRegistered = async (document: GeneratedDocumentRecord) => {
    if (!currentCompany) return;
    const owner = scopedEmployees.find(
      (item) => item.id === document.employeeId,
    );
    if (!owner) {
      toast.error("No encontramos la ficha del colaborador.");
      return;
    }
    const contentForPdf = composeDocument(
      buildDocument(
        document.kind,
        { ...owner, signatureData: employeeSignatures[owner.id] },
        currentCompany,
      ),
      defaultClauseFor(document.kind),
    );
    const consecutive = await nextConsecutive(
      currentCompany.id,
      document.kind,
    );
    await downloadDocumentPdf(
      contentForPdf,
      `${document.kind}-${owner.docNumber.replace(/\s+/g, "")}.pdf`,
      currentCompany,
      consecutive,
      { signed: document.status === "firmado" },
    );
  };

  const contractTemplateEnabled = (templateKind: DocumentKind) => {
    if (
      templateKind === "acuerdo-terminacion" ||
      templateKind === "carta-renuncia"
    ) {
      if (preselectedEmployee) {
        return (
          preselectedEmployee.status === "retirado" &&
          preselectedEmployee.contractType !== "prestacion-servicios"
        );
      }
      return retiredLaborEmployees.length > 0;
    }
    if (!templateKind.startsWith("contrato")) return true;
    if (preselectedEmployee) {
      return (
        templateKind ===
        documentKindForContract(preselectedEmployee.contractType)
      );
    }
    return activeEmployees.some(
      (item) =>
        documentKindForContract(item.contractType) === templateKind,
    );
  };

  const filteredDocuments = scopedDocuments.filter((document) => {
    if (statusFilter !== "todos" && document.status !== statusFilter)
      return false;
    const owner = scopedEmployees.find(
      (item) => item.id === document.employeeId,
    );
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${document.title} ${owner ? fullName(owner) : ""}`
      .toLowerCase()
      .includes(term);
  });

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany?.name}
        title="Documentos laborales"
        description="Plantillas vigentes en Colombia que se completan con la ficha del empleado y quedan registradas con su estado de firma."
        actions={
          <Button onClick={() => openGenerator()}>
            <FileSignature className="size-4" /> Generar documento
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map((template) => {
          const enabled = contractTemplateEnabled(template.kind);
          return (
            <button
              key={template.kind}
              type="button"
              onClick={() => openGenerator(template.kind)}
              disabled={!enabled}
              className={
                enabled
                  ? "surface-card group flex h-full flex-col items-start gap-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
                  : "surface-card flex h-full flex-col items-start gap-2 p-4 text-left opacity-50"
              }
            >
              <span
                className={`flex size-9 items-center justify-center rounded-lg ${template.tone}`}
              >
                <template.icon className="size-4" />
              </span>
              <span className="text-sm font-semibold leading-snug text-foreground">
                {DOCUMENT_LABELS[template.kind]}
              </span>
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                {enabled
                  ? template.description
                  : "No corresponde al contrato de la ficha o no hay empleados con ese contrato."}
              </span>
              {enabled ? (
                <span className="mt-auto pt-2 text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Generar →
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <Card className="surface-card border-0">
        <CardHeader className="flex flex-col gap-3 space-y-0 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-base font-semibold">
              Documentos generados
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {scopedDocuments.length} documentos en el histórico de la empresa
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar documento"
                className="pl-9 sm:w-[220px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="generado">Generado</SelectItem>
                <SelectItem value="firmado">Firmado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredDocuments.length === 0 ? (
              <EmptyState
                icon={FileSignature}
                title="Sin documentos"
                description="Genera un contrato, pagaré o política desde las plantillas de arriba."
              />
            ) : (
              filteredDocuments.map((document) => {
                const owner = scopedEmployees.find(
                  (item) => item.id === document.employeeId,
                );
                if (!owner) return null;
                return (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                  >
                    <EmployeeAvatar
                      firstName={owner.firstName}
                      lastName={owner.lastName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {document.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {fullName(owner)} · {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={document.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openViewer(document)}
                      >
                        <Eye className="size-3.5" /> Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditor(document)}
                        title="Editar o actualizar el documento"
                      >
                        <Pencil className="size-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void downloadRegistered(document)}
                      >
                        <Download className="size-3.5" /> PDF
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={generateOpen}
        onOpenChange={(open) => (open ? setGenerateOpen(true) : closeGenerator())}
      >
        <DialogContent className="max-w-5xl gap-0 p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="font-display text-lg">
              {editingDocumentId ? "Editar documento" : "Generar documento"}
            </DialogTitle>
            <DialogDescription>
              {editingDocumentId
                ? "Ajusta las cláusulas y guarda los cambios; el documento mantiene su estado y el registro de la ficha se actualiza."
                : "Completa los datos y revisa la vista previa antes de descargar o registrar el documento."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[70vh] gap-0 overflow-hidden lg:grid-cols-[340px_1fr]">
            <div className="space-y-3 overflow-y-auto border-b border-border p-5 scrollbar-slim lg:border-b-0 lg:border-r">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Tipo de documento
                </Label>
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    const nextKind = value as DocumentKind;
                    setKind(nextKind);
                    setExtraClause(defaultClauseFor(nextKind));
                    setKindTouched(true);
                    const required = contractTypeForDocument(nextKind);
                    const nextRequiresRetirement =
                      nextKind === "acuerdo-terminacion" ||
                      nextKind === "carta-renuncia";
                    if (
                      nextRequiresRetirement &&
                      (employee?.status !== "retirado" ||
                        employee?.contractType === "prestacion-servicios")
                    ) {
                      setEmployeeId("");
                    }
                    if (
                      !nextRequiresRetirement &&
                      employee?.status === "retirado"
                    ) {
                      setEmployeeId("");
                    }
                    if (
                      required &&
                      employee &&
                      employee.contractType !== required
                    ) {
                      setEmployeeId("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(
                        (template) =>
                          !employee ||
                          !template.kind.startsWith("contrato") ||
                          template.kind ===
                            documentKindForContract(employee.contractType),
                      )
                      .map((template) => (
                        <SelectItem
                          key={template.kind}
                          value={template.kind}
                        >
                          {DOCUMENT_LABELS[template.kind]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Empleado
                </Label>
                <Select
                  value={employeeId}
                  onValueChange={(value) => {
                    setEmployeeId(value);
                    const selected = activeEmployees.find(
                      (item) => item.id === value,
                    );
                    if (!selected) return;
                    if (requiresRetirement) {
                      if (selected.status !== "retirado") {
                        setEmployeeId("");
                        return;
                      }
                      setTerminationDate(
                        selected.endDate || new Date().toISOString().slice(0, 10),
                      );
                      return;
                    }
                    if (requiredContract) {
                      if (selected.contractType !== requiredContract) {
                        const assigned = documentKindForContract(
                          selected.contractType,
                        );
                        setKind(assigned);
                        setExtraClause(defaultClauseFor(assigned));
                      }
                    } else if (!kindTouched) {
                      const assigned = documentKindForContract(
                        selected.contractType,
                      );
                      setKind(assigned);
                      setExtraClause(defaultClauseFor(assigned));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={item.id}
                        disabled={
                          Boolean(requiredContract) &&
                          item.contractType !== requiredContract
                        }
                      >
                        {fullName(item)} · {item.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {requiredContract ? (
                <p className="rounded-lg bg-primary-soft/60 px-3 py-2 text-[11px] leading-relaxed text-primary">
                  Solo se genera el contrato asignado en la ficha del empleado.
                  {matchingEmployees.length === 0
                    ? " No hay empleados activos con este tipo de contrato."
                    : " Si necesitas otro tipo, cámbialo primero en su ficha."}
                </p>
              ) : null}

              {requiresRetirement ? (
                <p className="rounded-lg bg-warning-soft px-3 py-2 text-[11px] leading-relaxed text-warning">
                  {retiredLaborEmployees.length === 0
                    ? "Primero registra el retiro del empleado en Empleados; después podrás generar el acuerdo de terminación o la carta de renuncia."
                    : "Estos documentos solo se generan para empleados con retiro registrado y contrato de trabajo."}
                </p>
              ) : null}

              {employee &&
              kind.startsWith("contrato") &&
              kind !== documentKindForContract(employee.contractType) ? (
                <p className="rounded-lg border border-warning/25 bg-warning-soft/60 px-3 py-2 text-[11px] leading-relaxed text-warning">
                  La ficha de {fullName(employee)} tiene{" "}
                  {DOCUMENT_LABELS[
                    documentKindForContract(employee.contractType)
                  ].toLowerCase()}
                  . Se generará únicamente el tipo que elegiste:{" "}
                  <span className="font-semibold">
                    {DOCUMENT_LABELS[kind]}.
                  </span>
                </p>
              ) : null}

              {kind === "pagare" ? (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Monto del pagaré (COP)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={50_000}
                      value={amount}
                      onChange={(event) => setAmount(Number(event.target.value))}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatCOP(amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Plazo en meses
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={termMonths}
                      onChange={(event) =>
                        setTermMonths(Number(event.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Interés mensual (%)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={interest}
                      onChange={(event) => setInterest(Number(event.target.value))}
                    />
                  </div>
                </div>
              ) : null}

              {requiresRetirement ? (
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    {kind === "carta-renuncia"
                      ? "Último día laborado"
                      : "Fecha de terminación"}
                  </Label>
                  <Input
                    type="date"
                    value={terminationDate}
                    onChange={(event) =>
                      setTerminationDate(event.target.value)
                    }
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {kind === "carta-renuncia"
                      ? "La carta la firma el trabajador y la empresa deja constancia de recibido."
                      : "El acuerdo se firma por mutuo consentimiento (art. 61 del C.S.T.) y liquida salarios, prestaciones y vacaciones."}
                  </p>
                </div>
              ) : null}

              {kind === "contrato-prestacion-servicios" ? (
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Duración en meses
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={termMonths}
                    onChange={(event) => setTermMonths(Number(event.target.value))}
                  />
                </div>
              ) : null}

              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Cláusula adicional (editable)
                </Label>
                <Textarea
                  rows={4}
                  value={extraClause}
                  onChange={(event) => setExtraClause(event.target.value)}
                  placeholder="Cláusulas propias de la empresa para este documento."
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Se incluirá en este documento. Puedes guardar el texto base en
                  Ajustes → Plantillas.
                </p>
              </div>

              <div className="rounded-xl border border-warning/25 bg-warning-soft/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Los modelos se generan con los datos configurados de{" "}
                {currentCompany?.name}. Valida el texto con la asesoría jurídica
                antes de la firma.
              </div>

              <Button
                className="w-full"
                onClick={download}
                disabled={!content}
              >
                <Download className="size-4" /> Descargar PDF
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void register()}
                disabled={!content || registering || alreadyRegistered}
              >
                <BadgeCheck className="size-4" />
                {editingDocumentId
                  ? registering
                    ? "Actualizando…"
                    : "Actualizar documento"
                  : alreadyRegistered
                    ? "Ya está registrado en la ficha"
                    : registering
                      ? "Guardando…"
                      : "Registrar en la ficha"}
              </Button>
            </div>

            <div className="overflow-y-auto bg-muted/30 p-5 scrollbar-slim">
              {content ? (
                <DocumentPaper content={content} company={currentCompany} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    icon={FileText}
                    title="Elige un empleado"
                    description="La vista previa se construye con sus datos, los de la empresa y las cláusulas configuradas."
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl gap-0 p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle className="font-display text-lg">
              {viewing?.title}
            </DialogTitle>
            <DialogDescription>
              {viewing
                ? scopedEmployees.find((item) => item.id === viewing.employeeId)
                  ? fullName(
                      scopedEmployees.find(
                        (item) => item.id === viewing.employeeId,
                      )!,
                    )
                  : ""
                : ""}{" "}
              · {viewing ? formatDate(viewing.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[62vh] bg-muted/30 p-5">
            {viewingContent ? <DocumentPaper
              content={viewingContent}
              company={currentCompany}
              signed={viewing?.status === "firmado"}
            /> : null}
          </ScrollArea>
          <DialogFooter className="border-t border-border px-6 py-4">
            <div className="mr-auto flex items-center gap-2">
              {viewing ? <StatusPill status={viewing.status} /> : null}
              {viewing && viewing.status !== "firmado" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await setDocumentStatus(viewing.id, "firmado");
                    setViewing((current) =>
                      current ? { ...current, status: "firmado" } : current,
                    );
                  }}
                >
                  <BadgeCheck className="size-3.5" /> Marcar firmado
                </Button>
              ) : null}
            </div>
            {viewing ? (
              <Button variant="outline" onClick={() => openEditor(viewing)}>
                <Pencil className="size-4" /> Editar documento
              </Button>
            ) : null}
            {viewingContent ? (
              <Button
                disabled={viewingConsecutive === null}
                onClick={async () => {
                  if (!currentCompany || !viewing) return;
                  try {
                    await downloadDocumentPdf(
                      viewingContent,
                      `${viewing.kind}-${viewing.employeeId}.pdf`,
                      currentCompany,
                      viewingConsecutive ?? "",
                      { signed: viewing.status === "firmado" },
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "No pudimos generar el PDF.",
                    );
                  }
                }}
              >
                <Download className="size-4" />
                {viewingConsecutive === null ? "Preparando…" : "Descargar PDF"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
