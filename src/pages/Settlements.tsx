import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calculator,
  Coins,
  Download,
  FileText,
  History,
  Palmtree,
  Pencil,
  Percent,
  Receipt,
  Save,
  Trash2,
  UserMinus,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/context/app-context-value";
import {
  calculateSettlement,
  lastVacationPaymentDate,
  suggestedPendingSalaryDays,
  suggestedVacationDays,
  vacationDaysTakenSince,
} from "@/lib/settlement";
import {
  downloadGeneralSettlementPdf,
  downloadSettlementPdf,
} from "@/lib/settlement-pdf";
import {
  ACCRUAL_LABELS,
  calculateAccrual,
  type AccrualConcept,
  type AccrualTemplate,
} from "@/lib/accrual-template";
import {
  downloadAccrualTemplatePdf,
  downloadBulkAccrualPdf,
} from "@/lib/accrual-template-pdf";
import { downloadAccrualReceiptPdf } from "@/lib/accrual-receipt-pdf";
import { toast } from "sonner";
import { nextConsecutive } from "@/lib/consecutive";
import { buildCostSummary } from "@/lib/cost-summary";
import { suspensionDaysInRange } from "@/lib/payroll-periods";
import { lastEarnedSalary, lastPaidPayroll } from "@/lib/payroll";
import { downloadCostSummaryPdf } from "@/lib/cost-summary-pdf";
import {
  formatCOP,
  formatDate,
  formatDateLong,
  formatMonth,
  fullName,
} from "@/lib/format";
import type {
  AccrualPayment,
  Employee,
  SettlementRecord,
} from "@/data/types";

const emptyInput = {
  pendingSalaryDays: 0,
  vacationDays: 0,
  otherEarnings: 0,
  otherDeductions: 0,
};

export const Settlements = () => {
  const {
    currentCompany,
    companyEmployees,
    companyAbsences,
    retireEmployee,
    accrualPayments,
    addAccrualPayment,
    deleteAccrualPayment,
    companySettlements,
    saveSettlement,
    saveSettlements,
    deleteSettlement,
    companyPayrolls,
    employeeSignatures,
    companySuspensions,
  } = useApp();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<Employee | null>(null);
  const [settlementCutoff, setSettlementCutoff] = useState("");
  const [extraEarnings, setExtraEarnings] = useState<
    { id: string; label: string; amount: number }[]
  >([]);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraForm, setExtraForm] = useState({ label: "", amount: 0 });
  const [settleConcept, setSettleConcept] =
    useState<AccrualConcept>("cesantias");
  const [settleCutoff, setSettleCutoff] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [settleIds, setSettleIds] = useState<string[]>([]);
  const [settleEdits, setSettleEdits] = useState<
    Record<string, { amount: number; days: number }>
  >({});
  const [input, setInput] = useState(emptyInput);
  const [editingId, setEditingId] = useState<string | null>(null);
  const skipSuggestRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    employeeId: "",
    concept: "cesantias" as AccrualConcept,
    cutoff: new Date().toISOString().slice(0, 10),
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const soonIso = new Date(Date.now() + 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  // Las liquidaciones usan el último salario devengado del empleado.
  const payrollEmployees = useMemo(
    () =>
      companyEmployees.map((employee) => ({
        ...employee,
        salary: lastEarnedSalary(employee, companyPayrolls),
        signatureData: employeeSignatures[employee.id],
      })),
    [companyEmployees, companyPayrolls, employeeSignatures],
  );

  // Solo los pagos de prestaciones de los empleados de esta empresa.
  const scopedAccrualPayments = useMemo(() => {
    const ids = new Set(companyEmployees.map((employee) => employee.id));
    return accrualPayments.filter((payment) => ids.has(payment.employeeId));
  }, [accrualPayments, companyEmployees]);

  const retired = payrollEmployees.filter(
    (employee) =>
      employee.status === "retirado" &&
      employee.contractType !== "prestacion-servicios",
  );
  const expiring = payrollEmployees.filter(
    (employee) =>
      employee.status === "activo" &&
      employee.contractType === "fijo" &&
      employee.endDate &&
      employee.endDate <= soonIso,
  );

  const preselect = params.get("empleado");
  useEffect(() => {
    if (!preselect) return;
    const employee = retired.find((item) => item.id === preselect);
    if (employee) openSettlement(employee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, retired.length]);

  const closeSettlement = () => {
    setSelected(null);
    setEditingId(null);
    if (params.get("empleado")) {
      params.delete("empleado");
      setParams(params, { replace: true });
    }
  };

  const finalizeFixedContract = async (employee: Employee) => {
    await retireEmployee(employee.id);
    const endDate =
      employee.endDate && employee.endDate <= todayIso
        ? employee.endDate
        : todayIso;
    openSettlement({ ...employee, status: "retirado", endDate });
  };

  const suggestedPendingDays = (employee: Employee, cutoff?: string) => {
    const base = suggestedPendingSalaryDays(employee, companyPayrolls, cutoff);
    const end =
      cutoff ?? employee.endDate ?? new Date().toISOString().slice(0, 10);
    const from = `${end.slice(0, 7)}-01`;
    const suspended = suspensionDaysInRange(
      employee.id,
      companySuspensions,
      from,
      end,
    );
    return Math.max(0, base - suspended);
  };

  const openSettlement = (employee: Employee) => {
    setEditingId(null);
    const from = lastVacationPaymentDate(employee.id, scopedAccrualPayments);
    const taken = vacationDaysTakenSince(
      employee.id,
      companyAbsences,
      from,
    );
    setSettlementCutoff(
      employee.endDate ?? new Date().toISOString().slice(0, 10),
    );
    setExtraEarnings([]);
    setInput({
      pendingSalaryDays: suggestedPendingDays(
        employee,
        employee.endDate ?? undefined,
      ),
      vacationDays: suggestedVacationDays(employee, taken, from),
      otherEarnings: 0,
      otherDeductions: 0,
    });
    setSelected(employee);
  };

  const takenDays = useMemo(() => {
    if (!selected) return 0;
    return vacationDaysTakenSince(
      selected.id,
      companyAbsences,
      lastVacationPaymentDate(selected.id, scopedAccrualPayments),
    );
  }, [selected, companyAbsences, scopedAccrualPayments]);

  const selectedSalarySource = useMemo(
    () => (selected ? lastPaidPayroll(selected, companyPayrolls) : null),
    [selected, companyPayrolls],
  );

  const selectedPriorPayments = useMemo(
    () =>
      scopedAccrualPayments.filter(
        (payment) => payment.employeeId === selected?.id,
      ),
    [scopedAccrualPayments, selected],
  );

  const selectedRetired = retired.filter((employee) =>
    selectedIds.includes(employee.id),
  );

  const handleGeneralSettlement = async () => {
    if (!currentCompany || selectedRetired.length === 0) return;
    const rows = selectedRetired.map((employee) => {
      const from = lastVacationPaymentDate(employee.id, scopedAccrualPayments);
      const taken = vacationDaysTakenSince(
        employee.id,
        companyAbsences,
        from,
      );
      const prior = scopedAccrualPayments.filter(
        (payment) => payment.employeeId === employee.id,
      );
      const pendingDays = suggestedPendingDays(
        employee,
        employee.endDate ?? undefined,
      );
      const vacationDays = suggestedVacationDays(employee, taken, from);
      const settlement = calculateSettlement(
        employee,
        currentCompany,
        {
          pendingSalaryDays: pendingDays,
          vacationDays,
          terminationReason: employee.terminationReason ?? "",
          otherEarnings: 0,
          otherDeductions: 0,
          priorPayments: prior,
        },
        taken,
        from,
      );
      return { employee, result: settlement, pendingDays, vacationDays };
    });
    const consecutive = await nextConsecutive(
      currentCompany.id,
      "liquidacion-general",
    );
    await downloadGeneralSettlementPdf(rows, currentCompany, consecutive);
    // La liquidación general también queda en el historial de cada colaborador.
    const saved = await saveSettlements(
      rows.map((row) => ({
        employeeId: row.employee.id,
        cutoff: row.employee.endDate ?? todayIso,
        pendingSalaryDays: row.pendingDays,
        vacationDays: row.vacationDays,
        otherEarnings: 0,
        otherDeductions: 0,
        extraEarnings: [],
        lines: row.result.lines,
        priorPayments: row.result.priorPayments,
        gross: row.result.gross,
        legalDeductions: row.result.legalDeductions,
        totalDeductions: row.result.totalDeductions,
        net: row.result.net,
        daysYear: row.result.daysYear,
        daysSemester: row.result.daysSemester,
        notes: "Liquidación general",
      })),
    );
    if (saved > 0) {
      toast.success(
        `${saved} ${saved === 1 ? "liquidación guardada" : "liquidaciones guardadas"} en el historial.`,
      );
    }
  };

  const settlementEmployee = useMemo<Employee | null>(() => {
    if (!selected) return null;
    return settlementCutoff
      ? { ...selected, endDate: settlementCutoff }
      : selected;
  }, [selected, settlementCutoff]);

  const result = useMemo(() => {
    if (!settlementEmployee || !currentCompany) return null;
    return calculateSettlement(
      settlementEmployee,
      currentCompany,
      {
        ...input,
        otherEarnings:
          input.otherEarnings +
          extraEarnings.reduce((total, extra) => total + extra.amount, 0),
        terminationReason: settlementEmployee?.terminationReason ?? "",
        priorPayments: selectedPriorPayments,
      },
      takenDays,
      lastVacationPaymentDate(selected?.id ?? "", scopedAccrualPayments),
    );
  }, [
    settlementEmployee,
    currentCompany,
    input,
    takenDays,
    selectedPriorPayments,
    selected,
    scopedAccrualPayments,
  ]);

  useEffect(() => {
    if (!selected || !settlementCutoff) return;
    if (skipSuggestRef.current) {
      // Al abrir una liquidación guardada se respetan los valores del historial.
      skipSuggestRef.current = false;
      return;
    }
    const dated = { ...selected, endDate: settlementCutoff };
    setInput((current) => ({
      ...current,
      pendingSalaryDays: suggestedPendingDays(dated, settlementCutoff),
      vacationDays: suggestedVacationDays(
        dated,
        vacationDaysTakenSince(
          selected.id,
          companyAbsences,
          lastVacationPaymentDate(selected.id, scopedAccrualPayments),
        ),
        lastVacationPaymentDate(selected.id, scopedAccrualPayments),
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settlementCutoff, selected?.id]);

  const laborEmployees = payrollEmployees.filter(
    (employee) => employee.contractType !== "prestacion-servicios",
  );
  const activeLaborEmployees = laborEmployees.filter(
    (employee) => employee.status === "activo",
  );

  const openTemplate = (employeeId: string, concept: AccrualConcept) => {
    const picked = laborEmployees.find(
      (employee) => employee.id === employeeId,
    );
    setTemplateForm({
      employeeId,
      concept,
      cutoff:
        picked?.status === "retirado" && picked.endDate
          ? picked.endDate
          : new Date().toISOString().slice(0, 10),
    });
    setTemplateOpen(true);
  };

  const templateEmployee =
    laborEmployees.find((employee) => employee.id === templateForm.employeeId) ??
    null;
  const templateTaken = templateEmployee
    ? vacationDaysTakenSince(
        templateEmployee.id,
        companyAbsences,
        lastVacationPaymentDate(templateEmployee.id, scopedAccrualPayments),
      )
    : 0;
  const templateAccrual = useMemo(() => {
    if (!templateEmployee || !currentCompany) return null;
    return calculateAccrual(
      templateEmployee,
      currentCompany,
      templateForm.concept,
      {
        cutoff: templateForm.cutoff,
        priorPayments: scopedAccrualPayments.filter(
          (payment) => payment.employeeId === templateEmployee.id,
        ),
      },
      templateTaken,
    );
  }, [
    templateEmployee,
    currentCompany,
    templateForm.concept,
    templateForm.cutoff,
    scopedAccrualPayments,
    templateTaken,
  ]);

  const costRows = useMemo(() => {
    if (!currentCompany) return [];
    return laborEmployees.map((employee) => {
      const cutoff =
        employee.status === "retirado" && employee.endDate
          ? employee.endDate
          : todayIso;
      const employeePayrolls = companyPayrolls
        .filter((item) => item.employeeId === employee.id)
        .sort((a, b) => a.period.localeCompare(b.period));
      const latestPeriod =
        employeePayrolls[employeePayrolls.length - 1]?.period ?? "";
      // Une las quincenas del último periodo para mostrar la nómina completa.
      const latestPayrolls = employeePayrolls.filter(
        (item) => item.period === latestPeriod,
      );
      const mergedLines = new Map<string, (typeof latestPayrolls)[number]["lines"][number]>();
      latestPayrolls.forEach((item) => {
        item.lines.forEach((line) => {
          const key = `${line.kind}:${line.label}`;
          const previous = mergedLines.get(key);
          mergedLines.set(
            key,
            previous
              ? { ...line, amount: previous.amount + line.amount }
              : { ...line },
          );
        });
      });
      const payroll =
        latestPayrolls.length > 0
          ? {
              ...latestPayrolls[0],
              lines: Array.from(mergedLines.values()),
              ibc: latestPayrolls.reduce((sum, item) => sum + item.ibc, 0),
              fortnight: 1 as const,
            }
          : null;
      const summary = buildCostSummary(employee, currentCompany, payroll, {
        cutoff,
        takenVacationDays: vacationDaysTakenSince(
          employee.id,
          companyAbsences,
          lastVacationPaymentDate(employee.id, scopedAccrualPayments),
        ),
        priorPayments: scopedAccrualPayments.filter(
          (payment) => payment.employeeId === employee.id,
        ),
      });
      return { employee, summary };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentCompany,
    companyPayrolls,
    companyAbsences,
    scopedAccrualPayments,
    todayIso,
    payrollEmployees,
  ]);

  const settleRows = useMemo(() => {
    if (!currentCompany) return [];
    return laborEmployees.map((employee) => {
      const accrual = calculateAccrual(
        employee,
        currentCompany,
        settleConcept,
        {
          cutoff: settleCutoff,
          priorPayments: scopedAccrualPayments.filter(
            (payment) => payment.employeeId === employee.id,
          ),
        },
        vacationDaysTakenSince(
          employee.id,
          companyAbsences,
          lastVacationPaymentDate(employee.id, scopedAccrualPayments),
        ),
      );
      return { employee, accrual };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentCompany,
    settleConcept,
    settleCutoff,
    scopedAccrualPayments,
    companyAbsences,
    payrollEmployees,
  ]);

  const settleEditKey = (employeeId: string) =>
    `${settleConcept}:${settleCutoff}:${employeeId}`;

  const settleAmount = (row: { employee: { id: string }; accrual: AccrualTemplate }) =>
    settleEdits[settleEditKey(row.employee.id)]?.amount ?? row.accrual.net;

  const settleDays = (row: { employee: { id: string }; accrual: AccrualTemplate }) =>
    settleEdits[settleEditKey(row.employee.id)]?.days ?? row.accrual.days;

  const setSettleValue = (
    row: { employee: { id: string }; accrual: AccrualTemplate },
    patch: { amount?: number; days?: number },
  ) =>
    setSettleEdits((current) => ({
      ...current,
      [settleEditKey(row.employee.id)]: {
        amount: patch.amount ?? settleAmount(row),
        days: patch.days ?? settleDays(row),
      },
    }));

  const adjustedAccrual = (row: {
    employee: { id: string };
    accrual: AccrualTemplate;
  }): AccrualTemplate => {
    const amount = settleAmount(row);
    const edited =
      amount !== row.accrual.net || settleDays(row) !== row.accrual.days;
    return {
      ...row.accrual,
      days: settleDays(row),
      priorTotal: row.accrual.priorTotal,
      net: amount,
      value: row.accrual.priorTotal + amount,
      formula: edited
        ? `Valor ajustado manualmente · cálculo del sistema ${formatCOP(row.accrual.net)}`
        : row.accrual.formula,
    };
  };

  const selectedSettleRows = settleRows.filter((row) =>
    settleIds.includes(row.employee.id),
  );
  const settleTotal = selectedSettleRows.reduce(
    (total, row) => total + settleAmount(row),
    0,
  );

  const downloadPaymentReceipt = async (payment: AccrualPayment) => {
    if (!currentCompany) return;
    const employee = payrollEmployees.find(
      (item) => item.id === payment.employeeId,
    );
    if (!employee) {
      toast.error("No encontramos la ficha del colaborador.");
      return;
    }
    const consecutive = await nextConsecutive(
      currentCompany.id,
      "pago-prestacion",
    );
    await downloadAccrualReceiptPdf(
      payment,
      employee,
      currentCompany,
      scopedAccrualPayments,
      vacationDaysTakenSince(
        employee.id,
        companyAbsences,
        lastVacationPaymentDate(employee.id, scopedAccrualPayments),
      ),
      consecutive,
    );
  };

  const downloadBulkSettlement = async () => {
    if (!currentCompany || selectedSettleRows.length === 0) return;
    const consecutive = await nextConsecutive(
      currentCompany.id,
      `plantilla-${settleConcept}`,
    );
    await downloadBulkAccrualPdf(
      selectedSettleRows.map((row) => ({
        employee: row.employee,
        accrual: adjustedAccrual(row),
      })),
      currentCompany,
      consecutive,
    );
  };

  const downloadSettleReceipt = async (row: {
    employee: Employee;
    accrual: AccrualTemplate;
  }) => {
    if (!currentCompany) return;
    const consecutive = await nextConsecutive(
      currentCompany.id,
      `plantilla-${settleConcept}`,
    );
    await downloadAccrualTemplatePdf(
      row.employee,
      currentCompany,
      adjustedAccrual(row),
      consecutive,
    );
  };

  const downloadSelectedReceipts = async () => {
    if (!currentCompany || selectedSettleRows.length === 0) return;
    toast.info(
      `Generando ${selectedSettleRows.length} ${selectedSettleRows.length === 1 ? "recibo" : "recibos"}…`,
    );
    for (const row of selectedSettleRows) {
      const consecutive = await nextConsecutive(
        currentCompany.id,
        `plantilla-${settleConcept}`,
      );
      await downloadAccrualTemplatePdf(
        row.employee,
        currentCompany,
        adjustedAccrual(row),
        consecutive,
      );
    }
  };

  const registerBulkPayments = async () => {
    const rows = selectedSettleRows.filter((row) => settleAmount(row) > 0);
    if (rows.length === 0) {
      toast.error("Los colaboradores seleccionados no tienen saldo pendiente.");
      return;
    }
    for (const row of rows) {
      await addAccrualPayment({
        employeeId: row.employee.id,
        concept: settleConcept,
        amount: settleAmount(row),
        days: settleConcept === "vacaciones" ? settleDays(row) : 0,
        paidAt: settleCutoff,
        notes: "Liquidación por concepto",
      });
    }
    setSettleIds([]);
    toast.success(
      `${rows.length} ${rows.length === 1 ? "pago registrado" : "pagos registrados"} correctamente.`,
    );
  };

  const cutoffInvalid = Boolean(
    settlementEmployee &&
      settlementEmployee.endDate &&
      settlementEmployee.startDate &&
      settlementEmployee.endDate < settlementEmployee.startDate,
  );

  const downloadSettlementConcept = async (concept: AccrualConcept) => {
    if (!settlementEmployee || !currentCompany) return;
    const accrual = calculateAccrual(
      settlementEmployee,
      currentCompany,
      concept,
      {
        cutoff: settlementEmployee.endDate ?? todayIso,
        vacationDays: concept === "vacaciones" ? input.vacationDays : undefined,
        priorPayments: selectedPriorPayments,
      },
      takenDays,
    );
    const consecutive = await nextConsecutive(
      currentCompany.id,
      `plantilla-${concept}`,
    );
    await downloadAccrualTemplatePdf(
      settlementEmployee,
      currentCompany,
      accrual,
      consecutive,
    );
  };

  const openSavedSettlement = (record: SettlementRecord) => {
    const employee = payrollEmployees.find(
      (item) => item.id === record.employeeId,
    );
    if (!employee) {
      toast.error("No encontramos la ficha del colaborador.");
      return;
    }
    skipSuggestRef.current = true;
    setSettlementCutoff(record.cutoff);
    setEditingId(record.id);
    setExtraEarnings(
      record.extraEarnings.map((extra, index) => ({
        id: `${record.id}-${index}`,
        label: extra.label,
        amount: extra.amount,
      })),
    );
    setInput({
      pendingSalaryDays: record.pendingSalaryDays,
      vacationDays: record.vacationDays,
      otherEarnings: record.otherEarnings,
      otherDeductions: record.otherDeductions,
    });
    setSelected(employee);
  };

  const saveCurrentSettlement = async () => {
    if (!settlementEmployee || !result || !selected) return;
    const saved = await saveSettlement({
      id: editingId ?? undefined,
      employeeId: selected.id,
      cutoff: settlementCutoff || (settlementEmployee.endDate ?? todayIso),
      pendingSalaryDays: input.pendingSalaryDays,
      vacationDays: input.vacationDays,
      otherEarnings: input.otherEarnings,
      otherDeductions: input.otherDeductions,
      extraEarnings: extraEarnings.map(({ label, amount }) => ({
        label,
        amount,
      })),
      lines: result.lines,
      priorPayments: result.priorPayments,
      gross: result.gross,
      legalDeductions: result.legalDeductions,
      totalDeductions: result.totalDeductions,
      net: result.net,
      daysYear: result.daysYear,
      daysSemester: result.daysSemester,
      notes: "",
    });
    if (saved) toast.success("Liquidación guardada en el historial.");
  };

  const downloadSavedSettlement = async (record: SettlementRecord) => {
    if (!currentCompany) return;
    const employee = payrollEmployees.find(
      (item) => item.id === record.employeeId,
    );
    if (!employee) {
      toast.error("No encontramos la ficha del colaborador.");
      return;
    }
    const consecutive = await nextConsecutive(
      currentCompany.id,
      "liquidacion-final",
    );
    await downloadSettlementPdf(
      { ...employee, endDate: record.cutoff },
      currentCompany,
      {
        lines: record.lines,
        priorPayments: record.priorPayments,
        gross: record.gross,
        legalDeductions: record.legalDeductions,
        priorTotal: record.priorPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        ),
        totalDeductions: record.totalDeductions,
        net: record.net,
        daysYear: record.daysYear,
        daysSemester: record.daysSemester,
        suggestedVacationDays: record.vacationDays,
      },
      record.otherDeductions,
      consecutive,
    );
  };

  if (!currentCompany) return null;

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany.name}
        title="Liquidaciones finales"
        description="Registra y descarga los pagos de prestaciones por concepto, y genera la liquidación final con salario pendiente, vacaciones, cesantías, intereses y prima. Las liquidaciones que guardes quedan en el historial, donde puedes verlas, editarlas, descargarlas o eliminarlas. Los valores se calculan con la fecha de corte que elijas. No aplica a prestación de servicios."
        actions={
          <>
          <Button
            variant="outline"
            disabled={laborEmployees.length === 0}
            onClick={() =>
              openTemplate(
                activeLaborEmployees[0]?.id ?? laborEmployees[0]?.id ?? "",
                "cesantias",
              )
            }
          >
            <FileText className="size-4" /> Plantilla por empleado
          </Button>
          <Button
            variant="outline"
            disabled={selectedIds.length === 0}
            onClick={() => void handleGeneralSettlement()}
          >
            <FileText className="size-4" /> Liquidación general (
            {selectedIds.length})
          </Button>
          </>
        }
      />

      {expiring.length > 0 ? (
        <Card className="border-warning/30 bg-warning-soft/40">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Contratos a término fijo vencidos o por vencer (30 días)
            </p>
            {expiring.map((employee) => {
              const expired = (employee.endDate ?? "") <= todayIso;
              return (
                <div
                  key={employee.id}
                  className="flex flex-col gap-2 rounded-lg border border-warning/20 bg-card px-3 py-2 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {fullName(employee)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {employee.position} · {expired ? "Venció" : "Vence"} el{" "}
                      {formatDateLong(employee.endDate ?? "")} ·{" "}
                      {formatCOP(employee.salary)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void finalizeFixedContract(employee)}
                  >
                    <UserMinus className="size-3.5" /> Retirar y liquidar
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {retired.length === 0 ? (
        <EmptyState
          icon={UserMinus}
          title="Sin empleados retirados"
          description="Cuando registres el retiro de un empleado en Empleados, su liquidación final aparecerá aquí. También puedes liquidar un contrato a término fijo vencido desde la sección superior."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="surface-card border-0">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Empleados retirados
                  </p>
                  <p className="font-display text-2xl font-bold">
                    {retired.length}
                  </p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-lg bg-warning-soft text-warning">
                  <UserMinus className="size-4" />
                </span>
              </CardContent>
            </Card>
            <Card className="surface-card border-0">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Último retiro
                  </p>
                  <p className="font-display text-sm font-semibold">
                    {formatDateLong(
                      retired
                        .map((employee) => employee.endDate ?? "")
                        .sort()
                        .reverse()[0] ?? "",
                    )}
                  </p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <FileText className="size-4" />
                </span>
              </CardContent>
            </Card>
          </div>

          <Card className="surface-card border-0">
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-col gap-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Marca uno o varios empleados para generar una liquidación
                  general.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.length === retired.length
                        ? []
                        : retired.map((employee) => employee.id),
                    )
                  }
                >
                  {selectedIds.length === retired.length
                    ? "Quitar selección"
                    : "Seleccionar todos"}
                </Button>
              </div>
              {retired.map((employee) => (
                <div
                  key={employee.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  <Checkbox
                    checked={selectedIds.includes(employee.id)}
                    onCheckedChange={(checked) =>
                      setSelectedIds((current) =>
                        checked
                          ? Array.from(new Set([...current, employee.id]))
                          : current.filter((id) => id !== employee.id),
                      )
                    }
                    aria-label={`Seleccionar ${fullName(employee)}`}
                  />
                  <EmployeeAvatar
                    firstName={employee.firstName}
                    lastName={employee.lastName}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {fullName(employee)}
                      </p>
                      <StatusPill status={employee.status} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {employee.position} · Ingreso{" "}
                      {formatDate(employee.startDate)} · Retiro{" "}
                      {formatDateLong(employee.endDate ?? "")} · Salario{" "}
                      {formatCOP(employee.salary)} · Contrato{" "}
                      {employee.contractType.replace("-", " ")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openSettlement(employee)}>
                    <Calculator className="size-3.5" /> Calcular liquidación
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <Card className="surface-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <History className="size-4 text-primary" /> Historial de
            liquidaciones
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
              {companySettlements.length}
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cada liquidación final que guardes queda registrada con su fecha de
            corte y sus valores. Ábrela para revisarla, recalcularla con nuevos
            valores, descargar el comprobante o eliminarla.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {companySettlements.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              Aún no hay liquidaciones guardadas. Abre la liquidación de un
              colaborador y usa “Guardar liquidación”, o descarga una
              “Liquidación general” con los colaboradores seleccionados: ambas
              quedan en este historial.
            </p>
          ) : (
            companySettlements.map((record) => {
              const employee = payrollEmployees.find(
                (item) => item.id === record.employeeId,
              );
              return (
                <div
                  key={record.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
                >
                  <EmployeeAvatar
                    firstName={employee?.firstName ?? ""}
                    lastName={employee?.lastName ?? ""}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employee ? fullName(employee) : "Colaborador no disponible"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Corte {formatDateLong(record.cutoff)} ·{" "}
                      {record.vacationDays} días de vacaciones · Guardada el{" "}
                      {formatDate(record.createdAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-display text-sm font-bold text-primary">
                      {formatCOP(record.net)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Neto a pagar
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!employee}
                      onClick={() => openSavedSettlement(record)}
                    >
                      <Pencil className="size-3.5" /> Abrir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!employee}
                      title="Descargar comprobante PDF"
                      aria-label="Descargar comprobante PDF"
                      onClick={() => void downloadSavedSettlement(record)}
                    >
                      <Download className="size-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          title="Eliminar del historial"
                          aria-label="Eliminar del historial"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            ¿Eliminar esta liquidación del historial?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Se borrará la liquidación de{" "}
                            {employee ? fullName(employee) : "este colaborador"}{" "}
                            con corte {formatDateLong(record.cutoff)}. La nómina
                            y los pagos de prestaciones no se modifican.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void deleteSettlement(record.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="surface-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <Coins className="size-4 text-primary" /> Liquidar por concepto
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Escoge el concepto y los colaboradores que vas a liquidar. El valor
            se calcula a la fecha de corte y descuenta los abonos previos.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Concepto
              </Label>
              <Select
                value={settleConcept}
                onValueChange={(value) =>
                  setSettleConcept(value as AccrualConcept)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cesantias">Cesantías</SelectItem>
                  <SelectItem value="prima">Prima de servicios</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="intereses">
                    Intereses sobre cesantías
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Fecha de corte
              </Label>
              <Input
                type="date"
                value={settleCutoff}
                onChange={(event) => setSettleCutoff(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSettleIds(
                    settleIds.length === laborEmployees.length
                      ? []
                      : laborEmployees.map((employee) => employee.id),
                  )
                }
              >
                {settleIds.length === laborEmployees.length
                  ? "Quitar selección"
                  : "Seleccionar todos"}
              </Button>
            </div>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1 scrollbar-slim">
            {settleRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                No hay empleados con contrato laboral.
              </p>
            ) : (
              settleRows.map((row) => {
                const { employee, accrual } = row;
                const vacationFrom = lastVacationPaymentDate(
                  employee.id,
                  scopedAccrualPayments,
                );
                const restarts = Boolean(
                  settleConcept === "vacaciones" &&
                    vacationFrom &&
                    vacationFrom > employee.startDate,
                );
                return (
                  <div
                    key={employee.id}
                    className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2.5 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Checkbox
                        checked={settleIds.includes(employee.id)}
                        onCheckedChange={(checked) =>
                          setSettleIds((current) =>
                            checked
                              ? Array.from(new Set([...current, employee.id]))
                              : current.filter((id) => id !== employee.id),
                          )
                        }
                        aria-label={`Seleccionar ${fullName(employee)}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {fullName(employee)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {accrual.days.toLocaleString("es-CO", {
                            maximumFractionDigits: 1,
                          })}{" "}
                          días · valor {formatCOP(accrual.value)}
                          {accrual.priorTotal > 0
                            ? ` · abonos ${formatCOP(accrual.priorTotal)}`
                            : ""}{" "}
                          · ingreso {formatDate(employee.startDate)}
                          {settleConcept === "vacaciones"
                            ? " · sin auxilio de transporte"
                            : ""}
                          {restarts && vacationFrom
                            ? ` · causadas desde ${formatDate(vacationFrom)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2 sm:justify-end">
                      <div>
                        <p className="mb-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                          Valor a pagar
                        </p>
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          className="h-8 w-28 text-right text-xs"
                          value={settleAmount(row) || ""}
                          onChange={(event) =>
                            setSettleValue(row, {
                              amount: Number(event.target.value) || 0,
                            })
                          }
                          aria-label={`Valor a pagar a ${fullName(employee)}`}
                        />
                      </div>
                      {settleConcept === "vacaciones" ? (
                        <div>
                          <p className="mb-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                            Días
                          </p>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            className="h-8 w-20 text-right text-xs"
                            value={settleDays(row) || ""}
                            onChange={(event) => {
                              const days = Number(event.target.value) || 0;
                              setSettleValue(row, {
                                days,
                                amount: Math.round(
                                  (accrual.salaryBase / 30) * days,
                                ),
                              });
                            }}
                            aria-label={`Días a pagar a ${fullName(employee)}`}
                          />
                        </div>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        title="Descargar el recibo de este colaborador"
                        onClick={() => void downloadSettleReceipt(row)}
                      >
                        <Download className="size-3.5" /> Recibo
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {selectedSettleRows.length} seleccionados ·{" "}
                {ACCRUAL_LABELS[settleConcept]}
              </p>
              <p className="font-display text-lg font-bold text-primary">
                {formatCOP(settleTotal)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={selectedSettleRows.length === 0}
                onClick={() => void downloadBulkSettlement()}
              >
                <FileText className="size-3.5" /> Plantilla general
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selectedSettleRows.length === 0}
                onClick={() => void downloadSelectedReceipts()}
              >
                <Download className="size-3.5" /> Recibos (
                {selectedSettleRows.length})
              </Button>
              <Button
                size="sm"
                disabled={
                  selectedSettleRows.filter((row) => settleAmount(row) > 0)
                    .length === 0
                }
                onClick={() => void registerBulkPayments()}
              >
                <Coins className="size-3.5" /> Registrar pagos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <Coins className="size-4 text-primary" /> Pagos de prestaciones
            sociales
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Historial de pagos por empleado. El registro manual está
            deshabilitado: usa la tarjeta “Liquidar por concepto” para calcular
            y registrar los pagos.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {scopedAccrualPayments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              Aún no hay pagos registrados. Usa “Liquidar por concepto” para
              calcular y registrar los pagos.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {(
                ["cesantias", "intereses", "prima", "vacaciones"] as AccrualConcept[]
              ).map((concept) => {
                const total = scopedAccrualPayments
                  .filter((payment) => payment.concept === concept)
                  .reduce((sum, payment) => sum + payment.amount, 0);
                return (
                  <div
                    key={concept}
                    className="rounded-xl border border-border px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {ACCRUAL_LABELS[concept]}
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCOP(total)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {scopedAccrualPayments.length > 0 ? (
            <div className="pt-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Historial de pagos
              </p>
              <div className="space-y-2">
                {scopedAccrualPayments.map((payment) => {
                  const employee = payrollEmployees.find(
                    (item) => item.id === payment.employeeId,
                  );
                  return (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2 sm:flex-row sm:items-center"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                        {payment.concept === "vacaciones" ? (
                          <Palmtree className="size-4" />
                        ) : payment.concept === "intereses" ? (
                          <Percent className="size-4" />
                        ) : (
                          <Coins className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {employee ? fullName(employee) : "Empleado"} ·{" "}
                          {ACCRUAL_LABELS[payment.concept]}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDateLong(payment.paidAt)} ·{" "}
                          {formatCOP(payment.amount)}
                          {payment.days > 0 ? ` · ${payment.days} días` : ""}
                          {payment.notes ? ` · ${payment.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void downloadPaymentReceipt(payment)}
                        >
                          <Download className="size-3.5" /> Comprobante
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void deleteAccrualPayment(payment.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="surface-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <Receipt className="size-4 text-primary" /> Costo total del empleado
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Descarga en un solo PDF la nómina del periodo con sus deducciones y
            aportes de la empresa, más el saldo de cesantías, intereses, prima y
            vacaciones.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {costRows.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
              No hay empleados con contrato laboral para resumir.
            </p>
          ) : (
            costRows.map(({ employee, summary }) => (
              <div
                key={employee.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
              >
                <EmployeeAvatar
                  firstName={employee.firstName}
                  lastName={employee.lastName}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {fullName(employee)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {summary.periodLabel} · Nómina{" "}
                    {formatCOP(summary.payrollCost)} · Prestaciones{" "}
                    {formatCOP(summary.accrualsNet)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="font-display text-sm font-bold text-primary">
                    {formatCOP(summary.totalCost)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {summary.estimated ? "Proyección" : "Nómina cerrada"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const consecutive = await nextConsecutive(
                      currentCompany.id,
                      "costo-empleado",
                    );
                    await downloadCostSummaryPdf(
                      employee,
                      currentCompany,
                      summary,
                      consecutive,
                    );
                  }}
                >
                  <Download className="size-3.5" /> Resumen completo
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={extraOpen} onOpenChange={setExtraOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Agregar devengo a la liquidación
            </DialogTitle>
            <DialogDescription>
              Escribe el concepto y el valor que se sumará como devengo en la
              liquidación y en el comprobante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Concepto
              </Label>
              <Input
                value={extraForm.label}
                onChange={(event) =>
                  setExtraForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Bonificación, comisión, ajuste…"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Valor
              </Label>
              <Input
                type="number"
                min={0}
                value={extraForm.amount || ""}
                onChange={(event) =>
                  setExtraForm((current) => ({
                    ...current,
                    amount: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtraOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!extraForm.label.trim() || extraForm.amount <= 0}
              onClick={() => {
                setExtraEarnings((current) => [
                  ...current,
                  {
                    id: `${Date.now()}`,
                    label: extraForm.label.trim(),
                    amount: extraForm.amount,
                  },
                ]);
                setExtraOpen(false);
              }}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Plantilla de cesantías, prima o vacaciones
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Empleado
              </Label>
              <Select
                value={templateForm.employeeId}
                onValueChange={(value) => {
                  const picked = laborEmployees.find(
                    (employee) => employee.id === value,
                  );
                  setTemplateForm((current) => ({
                    ...current,
                    employeeId: value,
                    cutoff:
                      picked?.status === "retirado" && picked.endDate
                        ? picked.endDate
                        : current.cutoff,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el empleado" />
                </SelectTrigger>
                <SelectContent>
                  {laborEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {fullName(employee)} · {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Concepto
                </Label>
                <Select
                  value={templateForm.concept}
                  onValueChange={(value) =>
                    setTemplateForm((current) => ({
                      ...current,
                      concept: value as AccrualConcept,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cesantias">Cesantías</SelectItem>
                    <SelectItem value="prima">Prima de servicios</SelectItem>
                    <SelectItem value="vacaciones">Vacaciones</SelectItem>
                    <SelectItem value="intereses">
                      Intereses sobre cesantías
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Fecha de corte
                </Label>
                <Input
                  type="date"
                  value={templateForm.cutoff}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      cutoff: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {templateAccrual ? (
              <div className="rounded-xl border border-border p-3 text-xs">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {templateAccrual.periodLabel}
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      Días / base de cálculo
                    </span>
                    <span className="text-foreground">
                      {templateAccrual.days.toLocaleString("es-CO", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      días · {formatCOP(templateAccrual.baseForDisplay)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {ACCRUAL_LABELS[templateForm.concept]}
                    </span>
                    <span className="text-foreground">
                      {formatCOP(templateAccrual.value)}
                    </span>
                  </div>
                  {templateAccrual.priorTotal > 0 ? (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        Pagos previos del concepto
                      </span>
                      <span className="text-foreground">
                        − {formatCOP(templateAccrual.priorTotal)}
                      </span>
                    </div>
                  ) : null}
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Neto de la plantilla
                    </span>
                    <span className="font-display text-base font-bold text-primary">
                      {formatCOP(templateAccrual.net)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  {templateAccrual.formula}. Incluye firma del representante
                  legal y del colaborador.
                </p>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                Selecciona un empleado con contrato laboral.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!templateAccrual || !templateEmployee}
              onClick={async () => {
                if (!templateAccrual || !templateEmployee) return;
                const consecutive = await nextConsecutive(
                  currentCompany.id,
                  `plantilla-${templateForm.concept}`,
                );
                await downloadAccrualTemplatePdf(
                  templateEmployee,
                  currentCompany,
                  templateAccrual,
                  consecutive,
                );
              }}
            >
              <Download className="size-4" /> Descargar plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && closeSettlement()}
      >
        <SheetContent className="w-full overflow-y-auto scrollbar-slim sm:max-w-[640px]">
          {selected && result ? (
            <>
              <SheetHeader className="space-y-2 pb-4">
                <SheetTitle className="font-display text-xl">
                  {fullName(selected)}
                </SheetTitle>
                <SheetDescription>
                  Corte {formatDateLong(settlementCutoff || selected.endDate || "")} ·{" "}
                  {selected.position} · Ingreso{" "}
                  {formatDateLong(selected.startDate)}
                </SheetDescription>
                <StatusPill status="retirado" />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Salario de liquidación:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCOP(selected.salary)}
                  </span>
                  {selectedSalarySource
                    ? ` · último pago ${formatMonth(selectedSalarySource.period)} · quincena ${selectedSalarySource.fortnight}`
                    : " · sin nóminas pagadas, se usa el salario de la ficha"}
                </p>
              </SheetHeader>

              <Separator />

              <div className="space-y-5 py-4">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Fecha de corte de la liquidación
                  </Label>
                  <Input
                    type="date"
                    value={settlementCutoff}
                    onChange={(event) =>
                      setSettlementCutoff(event.target.value)
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Cesantías, intereses, prima y vacaciones se calculan hasta
                    esta fecha.
                  </p>
                  {cutoffInvalid ? (
                    <p className="mt-1 rounded-lg bg-destructive-soft px-2 py-1.5 text-[10px] text-destructive">
                      La fecha de corte no puede ser anterior al ingreso (
                      {formatDateLong(selected.startDate)}).
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Días de salario pendientes
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={input.pendingSalaryDays || ""}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          pendingSalaryDays: Number(event.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Días de vacaciones pendientes
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={input.vacationDays || ""}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          vacationDays: Number(event.target.value) || 0,
                        }))
                      }
                      placeholder={String(result.suggestedVacationDays)}
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Sugerido: {result.suggestedVacationDays} días · disfrutados
                      desde el último pago: {takenDays}
                    </p>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Otros devengos
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={10000}
                      value={input.otherEarnings || ""}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          otherEarnings: Number(event.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Otras deducciones
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step={10000}
                      value={input.otherDeductions || ""}
                      onChange={(event) =>
                        setInput((current) => ({
                          ...current,
                          otherDeductions: Number(event.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border">
                  {result.lines.map((line) => (
                    <div
                      key={line.label}
                      className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {line.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {line.detail}
                        </p>
                      </div>
                      <p className="text-xs font-semibold tabular-nums text-foreground">
                        {formatCOP(line.amount)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 rounded-xl bg-muted/50 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total devengado
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCOP(result.gross)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Deducciones de ley
                    </span>
                    <span className="text-foreground">
                      − {formatCOP(result.legalDeductions)}
                    </span>
                  </div>
                  {input.otherDeductions > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Otras deducciones
                      </span>
                      <span className="text-foreground">
                        − {formatCOP(input.otherDeductions)}
                      </span>
                    </div>
                  ) : null}
                  {result.priorPayments.map((payment, index) => (
                    <div
                      key={`${payment.label}-${index}`}
                      className="flex justify-between gap-2"
                    >
                      <span className="text-muted-foreground">
                        {payment.label}
                      </span>
                      <span className="shrink-0 text-foreground">
                        − {formatCOP(payment.amount)}
                      </span>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Neto a pagar
                    </span>
                    <span className="font-display text-lg font-bold text-primary">
                      {formatCOP(result.net)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={cutoffInvalid}
                    onClick={() => void saveCurrentSettlement()}
                  >
                    <Save className="size-4" />{" "}
                    {editingId
                      ? "Actualizar liquidación guardada"
                      : "Guardar liquidación"}
                  </Button>
                  {editingId ? (
                    <p className="text-center text-[10px] text-muted-foreground">
                      Editando una liquidación del historial. Al guardar se
                      actualiza el registro con la fecha de corte actual.
                    </p>
                  ) : null}
                </div>

                <Button
                  className="w-full"
                  disabled={cutoffInvalid}
                  onClick={async () => {
                    const consecutive = await nextConsecutive(
                      currentCompany.id,
                      "liquidacion-final",
                    );
                    await downloadSettlementPdf(
                      settlementEmployee ?? selected,
                      currentCompany,
                      result,
                      input.otherDeductions,
                      consecutive,
                    );
                  }}
                >
                  <Download className="size-4" /> Comprobante de liquidación
                  PDF
                </Button>

                <div className="rounded-xl border border-dashed border-border p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Plantillas por concepto
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Descarga la plantilla de pago firmable de cesantías, prima
                    de servicios o vacaciones con los valores de esta
                    liquidación.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        "cesantias",
                        "prima",
                        "vacaciones",
                        "intereses",
                      ] as AccrualConcept[]
                    ).map((concept) => (
                      <Button
                        key={concept}
                        size="sm"
                        variant="outline"
                        disabled={cutoffInvalid}
                        onClick={() => void downloadSettlementConcept(concept)}
                      >
                        <FileText className="size-3.5" />{" "}
                        {ACCRUAL_LABELS[concept]}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const row = costRows.find(
                      (item) => item.employee.id === selected.id,
                    );
                    if (!row) return;
                    const consecutive = await nextConsecutive(
                      currentCompany.id,
                      "costo-empleado",
                    );
                    await downloadCostSummaryPdf(
                      row.employee,
                      currentCompany,
                      row.summary,
                      consecutive,
                    );
                  }}
                >
                  <Receipt className="size-4" /> Resumen completo: nómina +
                  prestaciones
                </Button>

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Aplica a contratos indefinidos, a término fijo y por obra o
                  labor. Cálculo estimado con salario base de{" "}
                  {formatCOP(selected.salary)}. Cesantías, intereses y prima se
                  liquidan proporcionalmente al tiempo del año o semestre, y las
                  vacaciones a 15 días hábiles por año. Todo se calcula con año
                  laboral de 360 días (12 meses de 30). No incluye indemnización
                  por despido sin justa causa. Valida el resultado con tu
                  contador o abogado laboral. Periodo de referencia:{" "}
                  {formatMonth(
                    (selected.endDate ?? new Date().toISOString().slice(0, 10)).slice(
                      0,
                      7,
                    ),
                  )}
                  .
                </p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
};
