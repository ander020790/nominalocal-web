export type Role = "owner" | "admin" | "employee" | "pending";

export type RiskLevel = "I" | "II" | "III" | "IV" | "V";

export type ContractType =
  | "indefinido"
  | "fijo"
  | "obra-labor"
  | "prestacion-servicios";

export type PayrollStatus = "borrador" | "revisado" | "pagado";

export type AbsenceType =
  | "vacaciones"
  | "incapacidad"
  | "permiso"
  | "licencia"
  | "no-remunerada";

export type DocumentKind =
  | "contrato-indefinido"
  | "contrato-fijo"
  | "contrato-obra-labor"
  | "contrato-prestacion-servicios"
  | "pagare"
  | "confidencialidad"
  | "politica-ventas"
  | "acuerdo-terminacion"
  | "carta-renuncia";

export type DocumentStatus = "borrador" | "generado" | "firmado";

export interface PayrollParams {
  year: number;
  smmlv: number;
  transportAllowance: number;
  motoAllowance?: number;
  uvt: number;
  healthEmployee: number;
  pensionEmployee: number;
  solidarityThreshold: number;
  solidarityRate: number;
  healthEmployer: number;
  pensionEmployer: number;
  compensationFund: number;
  sena: number;
  icbf: number;
  exonerated: boolean;
  arl: Record<RiskLevel, number>;
  cesantias: number;
  interestCesantias: number;
  prima: number;
  vacaciones: number;
  nightStartHour: number;
  nightSurcharge: number;
  extraDaySurcharge: number;
  extraNightSurcharge: number;
  sundayHolidaySurcharge: number;
  weeklyHours: number;
}

export interface SalaryConcept {
  id: string;
  name: string;
  type: "earning" | "deduction";
  kind: "fijo" | "variable";
  taxable: boolean;
  cotizable: boolean;
  prestacional: boolean;
}

export interface PointOfSale {
  id: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  phone?: string;
}

export interface Company {
  id: string;
  name: string;
  nit: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  legalRep: string;
  legalRepDoc: string;
  status: "activa" | "inactiva";
  createdAt: string;
  params: PayrollParams;
  concepts: SalaryConcept[];
  pointsOfSale: PointOfSale[];
  clauses?: string;
  accessCode?: string;
  department?: string;
  economicActivity?: string;
  taxResponsibilities?: string;
  signatureData?: string;
  logoData?: string;
  letterheadCode?: string;
  letterheadVersion?: string;
  letterheadValidity?: string;
  templateClauses?: Partial<Record<DocumentKind, string>>;
  payrollBank?: string;
  payrollAccountType?: "S" | "D";
  payrollAccountNumber?: string;
}

export interface FixedEarning {
  label: string;
  amount: number;
  nature?: "salarial" | "no-salarial";
  cotizable?: boolean;
  prestacional?: boolean;
  taxable?: boolean;
}

export interface FixedDeduction {
  label: string;
  amount: number;
  schedule?: "first" | "second" | "both";
}

export interface Employee {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  docType: "CC" | "CE" | "Pasaporte";
  docNumber: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  position: string;
  department: string;
  pointOfSaleId: string | null;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  salary: number;
  integralSalary: boolean;
  transportAllowance: boolean;
  motoAllowance?: boolean;
  riskLevel: RiskLevel;
  eps: string;
  pensionFund: string;
  arlProvider: string;
  compensationFund: string;
  bank: string;
  accountType: "ahorros" | "corriente";
  accountNumber: string;
  status: "activo" | "retirado";
  fixedEarnings: FixedEarning[];
  fixedDeductions: FixedDeduction[];
  /** Firma digital dibujada por el colaborador (solo en memoria). */
  signatureData?: string;
  /** Motivo del retiro o terminación del contrato. */
  terminationReason?: TerminationReason;
}

export type TerminationReason =
  | "renuncia"
  | "mutuo-acuerdo"
  | "despido-sin-justa-causa"
  | "despido-con-justa-causa"
  | "vencimiento-plazo"
  | "fin-obra"
  | "";

export interface PayrollLine {
  id: string;
  kind: "earning" | "deduction" | "employer";
  label: string;
  amount: number;
  group: "devengo" | "deduccion" | "aportes" | "provisiones";
  detail?: string;
}

export interface Payroll {
  id: string;
  companyId: string;
  employeeId: string;
  period: string;
  status: PayrollStatus;
  lines: PayrollLine[];
  ibc: number;
  createdAt: string;
  paymentDate?: string | null;
  fortnight: 1 | 2;
  daysWorked?: number | null;
  novelties?: Record<string, number>;
}

export type AccrualConcept =
  | "cesantias"
  | "vacaciones"
  | "prima"
  | "intereses";

export type LoanStatus = "solicitado" | "aprobado" | "rechazado" | "pagado";

export interface EmployeeLoan {
  id: string;
  companyId: string;
  employeeId: string;
  amount: number;
  installments: number;
  reason: string;
  status: LoanStatus;
  startPeriod: string;
  note: string;
  requestedAt: string;
  reviewedAt: string | null;
}

export interface AccrualPayment {
  id: string;
  companyId: string;
  employeeId: string;
  concept: AccrualConcept;
  amount: number;
  days: number;
  paidAt: string;
  notes: string;
}

export interface SettlementSaveInput {
  id?: string;
  employeeId: string;
  cutoff: string;
  pendingSalaryDays: number;
  vacationDays: number;
  otherEarnings: number;
  otherDeductions: number;
  extraEarnings: { label: string; amount: number }[];
  lines: { label: string; detail: string; amount: number }[];
  priorPayments: { label: string; detail: string; amount: number }[];
  gross: number;
  legalDeductions: number;
  totalDeductions: number;
  net: number;
  daysYear: number;
  daysSemester: number;
  notes: string;
}

export interface SettlementRecord {
  id: string;
  companyId: string;
  employeeId: string;
  cutoff: string;
  pendingSalaryDays: number;
  vacationDays: number;
  otherEarnings: number;
  otherDeductions: number;
  extraEarnings: { label: string; amount: number }[];
  lines: { label: string; detail: string; amount: number }[];
  priorPayments: { label: string; detail: string; amount: number }[];
  gross: number;
  legalDeductions: number;
  totalDeductions: number;
  net: number;
  daysYear: number;
  daysSemester: number;
  notes: string;
  createdAt: string;
}

export interface PayrollPeriodClosure {
  companyId: string;
  period: string;
  closedAt: string;
}

export interface Absence {
  id: string;
  companyId: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  days: number;
  status: "pendiente" | "aprobada" | "rechazada";
  notes: string;
}

export interface GeneratedDocumentRecord {
  id: string;
  companyId: string;
  employeeId: string;
  kind: DocumentKind;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  clause?: string;
}

export interface CompanyUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  companyId: string | null;
  employeeId: string | null;
}

export interface CompanyInvite {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  employeeId: string | null;
  createdAt: string;
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  employeeId: string | null;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string | null;
  employeeId: string | null;
}
