import type { Database, Json } from "@/integrations/supabase/types";
import type {
  Absence,
  AccrualPayment,
  CompanyInvite,
  CompanyUser,
  Company,
  Employee,
  GeneratedDocumentRecord,
  Payroll,
  PayrollLine,
  PayrollStatus,
  PointOfSale,
  SalaryConcept,
  SettlementRecord,
} from "@/data/types";
import type { PayrollParams } from "@/data/types";

type Tables = Database["public"]["Tables"];
export type CompanyRow = Tables["payroll_companies"]["Row"];
export type CompanyInsert = Tables["payroll_companies"]["Insert"];
export type EmployeeRow = Tables["payroll_employees"]["Row"];
export type EmployeeInsert = Tables["payroll_employees"]["Insert"];
export type PayrollRow = Tables["payroll_payrolls"]["Row"];
export type AbsenceRow = Tables["payroll_absences"]["Row"];
export type DocumentRow = Tables["payroll_documents"]["Row"];
export type AccrualPaymentRow = Tables["payroll_accrual_payments"]["Row"];
export type SettlementRow = Tables["payroll_settlements"]["Row"];
export type MemberRow = Tables["payroll_members"]["Row"];
export type InviteRow = Tables["payroll_invites"]["Row"];

const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : "");

const jsonArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

export const mapCompany = (row: CompanyRow): Company => ({
  id: row.id,
  name: row.name,
  nit: row.nit,
  city: row.city,
  address: row.address,
  phone: row.phone,
  email: row.email,
  legalRep: row.legal_rep,
  legalRepDoc: row.legal_rep_doc,
  status: row.status === "inactiva" ? "inactiva" : "activa",
  createdAt: dateOnly(row.created_at),
  params: row.params as unknown as PayrollParams,
  concepts: (row.concepts ?? []) as unknown as SalaryConcept[],
  pointsOfSale: (row.points_of_sale ?? []) as unknown as PointOfSale[],
  clauses: row.clauses,
  accessCode: row.access_code,
  department: row.department,
  economicActivity: row.economic_activity,
  taxResponsibilities: row.tax_responsibilities,
  signatureData: row.signature_data,
  logoData: row.logo_data,
  letterheadCode: row.letterhead_code,
  letterheadVersion: row.letterhead_version,
  letterheadValidity: row.letterhead_validity,
  payrollBank: row.payroll_bank,
  payrollAccountType: row.payroll_account_type === "D" ? "D" : "S",
  payrollAccountNumber: row.payroll_account_number,
  templateClauses: (row.template_clauses ?? {}) as Company["templateClauses"],
});

export const mapEmployee = (row: EmployeeRow): Employee => ({
  id: row.id,
  companyId: row.company_id,
  firstName: row.first_name,
  lastName: row.last_name,
  docType: row.doc_type as Employee["docType"],
  docNumber: row.doc_number,
  birthDate: dateOnly(row.birth_date),
  email: row.email,
  phone: row.phone,
  address: row.address,
  city: row.city,
  position: row.position,
  department: row.department,
  pointOfSaleId: row.point_of_sale_id,
  contractType: row.contract_type as Employee["contractType"],
  startDate: dateOnly(row.start_date),
  endDate: row.end_date ? dateOnly(row.end_date) : null,
  salary: Number(row.salary),
  integralSalary: row.integral_salary,
  transportAllowance: row.transport_allowance,
  motoAllowance: row.has_moto_allowance,
  riskLevel: row.risk_level as Employee["riskLevel"],
  eps: row.eps,
  pensionFund: row.pension_fund,
  arlProvider: row.arl_provider,
  compensationFund: row.compensation_fund,
  bank: row.bank,
  accountNumber: row.account_number,
  accountType: row.account_type === "corriente" ? "corriente" : "ahorros",
  status: row.status === "retirado" ? "retirado" : "activo",
  fixedEarnings: (row.fixed_earnings ?? []) as unknown as Employee["fixedEarnings"],
  fixedDeductions: (row.fixed_deductions ?? []) as unknown as Employee["fixedDeductions"],
  terminationReason:
    (row.termination_reason as Employee["terminationReason"]) ?? "",
});

export const mapPayroll = (row: PayrollRow): Payroll => ({
  id: row.id,
  companyId: row.company_id,
  employeeId: row.employee_id,
  period: row.period,
  status: row.status as PayrollStatus,
  lines: (row.lines ?? []) as unknown as PayrollLine[],
  ibc: Number(row.ibc),
  createdAt: dateOnly(row.created_at),
  paymentDate: row.payment_date ? dateOnly(row.payment_date) : null,
  fortnight: row.fortnight === 2 ? 2 : 1,
  daysWorked: row.days_worked ?? null,
  novelties: (row.novelties ?? {}) as Record<string, number>,
});

export const mapAbsence = (row: AbsenceRow): Absence => ({
  id: row.id,
  companyId: row.company_id,
  employeeId: row.employee_id,
  type: row.type as Absence["type"],
  startDate: dateOnly(row.start_date),
  endDate: dateOnly(row.end_date),
  days: row.days,
  status: row.status as Absence["status"],
  notes: row.notes,
});

export const mapMember = (row: MemberRow): CompanyUser => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  email: row.email,
  role: row.role === "admin" ? "admin" : "employee",
  companyId: row.company_id,
  employeeId: row.employee_id,
});

export const mapInvite = (row: InviteRow): CompanyInvite => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  email: row.email,
  role: row.role === "admin" ? "admin" : "employee",
  employeeId: row.employee_id,
  createdAt: dateOnly(row.created_at),
});

export const mapAccrualPayment = (
  row: AccrualPaymentRow,
): AccrualPayment => ({
  id: row.id,
  companyId: row.company_id,
  employeeId: row.employee_id,
  concept: row.concept as AccrualPayment["concept"],
  amount: Number(row.amount),
  days: Number(row.days),
  paidAt: dateOnly(row.paid_at),
  notes: row.notes,
});

export const mapSettlement = (row: SettlementRow): SettlementRecord => ({
  id: row.id,
  companyId: row.company_id,
  employeeId: row.employee_id,
  cutoff: dateOnly(row.cutoff),
  pendingSalaryDays: Number(row.pending_salary_days),
  vacationDays: Number(row.vacation_days),
  otherEarnings: Number(row.other_earnings),
  otherDeductions: Number(row.other_deductions),
  extraEarnings: jsonArray(row.extra_earnings).map((item) => ({
    label: String(item.label ?? ""),
    amount: Number(item.amount) || 0,
  })),
  lines: jsonArray(row.lines).map((item) => ({
    label: String(item.label ?? ""),
    detail: String(item.detail ?? ""),
    amount: Number(item.amount) || 0,
  })),
  priorPayments: jsonArray(row.prior_payments).map((item) => ({
    label: String(item.label ?? ""),
    detail: String(item.detail ?? ""),
    amount: Number(item.amount) || 0,
  })),
  gross: Number(row.gross),
  legalDeductions: Number(row.legal_deductions),
  totalDeductions: Number(row.total_deductions),
  net: Number(row.net),
  daysYear: Number(row.days_year),
  daysSemester: Number(row.days_semester),
  notes: row.notes,
  createdAt: dateOnly(row.created_at),
});

export const mapDocument = (row: DocumentRow): GeneratedDocumentRecord => ({
  id: row.id,
  companyId: row.company_id,
  employeeId: row.employee_id,
  kind: row.kind as GeneratedDocumentRecord["kind"],
  title: row.title,
  status: row.status as GeneratedDocumentRecord["status"],
  createdAt: dateOnly(row.created_at),
  clause: row.extra_clause ?? "",
});

export const employeeToInsert = (
  companyId: string,
  employee: Omit<Employee, "id" | "companyId" | "status">,
): EmployeeInsert => ({
  company_id: companyId,
  first_name: employee.firstName,
  last_name: employee.lastName,
  doc_type: employee.docType,
  doc_number: employee.docNumber,
  birth_date: employee.birthDate || null,
  email: employee.email,
  phone: employee.phone,
  address: employee.address,
  city: employee.city,
  position: employee.position,
  department: employee.department,
  point_of_sale_id: employee.pointOfSaleId,
  contract_type: employee.contractType,
  start_date: employee.startDate,
  end_date: employee.endDate,
  salary: employee.salary,
  integral_salary: employee.integralSalary,
  transport_allowance: employee.transportAllowance,
  has_moto_allowance: employee.motoAllowance ?? false,
  risk_level: employee.riskLevel,
  eps: employee.eps,
  pension_fund: employee.pensionFund,
  arl_provider: employee.arlProvider,
  compensation_fund: employee.compensationFund,
  bank: employee.bank,
  account_type: employee.accountType,
  account_number: employee.accountNumber,
  fixed_earnings: employee.fixedEarnings as unknown as Json,
  fixed_deductions: employee.fixedDeductions as unknown as Json,
  status: "activo",
});

export const employeePatch = (
  patch: Partial<Employee>,
): Tables["payroll_employees"]["Update"] => {
  const row: Tables["payroll_employees"]["Update"] = {};
  if (patch.firstName !== undefined) row.first_name = patch.firstName;
  if (patch.lastName !== undefined) row.last_name = patch.lastName;
  if (patch.docType !== undefined) row.doc_type = patch.docType;
  if (patch.docNumber !== undefined) row.doc_number = patch.docNumber;
  if (patch.birthDate !== undefined) row.birth_date = patch.birthDate || null;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.department !== undefined) row.department = patch.department;
  if (patch.pointOfSaleId !== undefined)
    row.point_of_sale_id = patch.pointOfSaleId;
  if (patch.contractType !== undefined) row.contract_type = patch.contractType;
  if (patch.startDate !== undefined) row.start_date = patch.startDate;
  if (patch.endDate !== undefined) row.end_date = patch.endDate;
  if (patch.salary !== undefined) row.salary = patch.salary;
  if (patch.integralSalary !== undefined)
    row.integral_salary = patch.integralSalary;
  if (patch.transportAllowance !== undefined)
    row.transport_allowance = patch.transportAllowance;
  if (patch.motoAllowance !== undefined)
    row.has_moto_allowance = patch.motoAllowance;
  if (patch.riskLevel !== undefined) row.risk_level = patch.riskLevel;
  if (patch.eps !== undefined) row.eps = patch.eps;
  if (patch.pensionFund !== undefined) row.pension_fund = patch.pensionFund;
  if (patch.arlProvider !== undefined) row.arl_provider = patch.arlProvider;
  if (patch.compensationFund !== undefined)
    row.compensation_fund = patch.compensationFund;
  if (patch.bank !== undefined) row.bank = patch.bank;
  if (patch.accountNumber !== undefined)
    row.account_number = patch.accountNumber;
  if (patch.accountType !== undefined)
    row.account_type = patch.accountType;
  if (patch.fixedEarnings !== undefined)
    row.fixed_earnings = patch.fixedEarnings as unknown as Json;
  if (patch.fixedDeductions !== undefined)
    row.fixed_deductions = patch.fixedDeductions as unknown as Json;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.endDate === null) row.end_date = null;
  return row;
};

export const companyPatch = (
  patch: Partial<Company>,
): Tables["payroll_companies"]["Update"] => {
  const row: Tables["payroll_companies"]["Update"] = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.nit !== undefined) row.nit = patch.nit;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.legalRep !== undefined) row.legal_rep = patch.legalRep;
  if (patch.legalRepDoc !== undefined) row.legal_rep_doc = patch.legalRepDoc;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.clauses !== undefined) row.clauses = patch.clauses;
  if (patch.department !== undefined) row.department = patch.department;
  if (patch.economicActivity !== undefined)
    row.economic_activity = patch.economicActivity;
  if (patch.taxResponsibilities !== undefined)
    row.tax_responsibilities = patch.taxResponsibilities;
  if (patch.signatureData !== undefined)
    row.signature_data = patch.signatureData;
  if (patch.logoData !== undefined) row.logo_data = patch.logoData;
  if (patch.letterheadCode !== undefined)
    row.letterhead_code = patch.letterheadCode;
  if (patch.letterheadVersion !== undefined)
    row.letterhead_version = patch.letterheadVersion;
  if (patch.letterheadValidity !== undefined)
    row.letterhead_validity = patch.letterheadValidity;
  if (patch.payrollBank !== undefined) row.payroll_bank = patch.payrollBank;
  if (patch.payrollAccountType !== undefined)
    row.payroll_account_type = patch.payrollAccountType;
  if (patch.payrollAccountNumber !== undefined)
    row.payroll_account_number = patch.payrollAccountNumber;
  if (patch.templateClauses !== undefined)
    row.template_clauses =
      patch.templateClauses as unknown as CompanyRow["template_clauses"];
  if (patch.params !== undefined)
    row.params = patch.params as unknown as CompanyRow["params"];
  if (patch.concepts !== undefined)
    row.concepts = patch.concepts as unknown as CompanyRow["concepts"];
  if (patch.pointsOfSale !== undefined)
    row.points_of_sale =
      patch.pointsOfSale as unknown as CompanyRow["points_of_sale"];
  return row;
};
