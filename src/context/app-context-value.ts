import { createContext, useContext } from "react";
import type {
  Absence,
  AccrualConcept,
  AccrualPayment,
  AbsenceType,
  Company,
  CompanyInvite,
  CompanyUser,
  DocumentKind,
  DocumentStatus,
  Employee,
  GeneratedDocumentRecord,
  Payroll,
  PayrollLine,
  PayrollPeriodClosure,
  PayrollStatus,
  Role,
  SalaryConcept,
  Session,
  SettlementRecord,
  SettlementSaveInput,
} from "@/data/types";
import type { PayrollNovelties } from "@/lib/payroll";
import type { RutPointOfSale } from "@/lib/rut";

export interface NewEmployeeInput {
  fixedEarnings?: Employee["fixedEarnings"];
  fixedDeductions?: Employee["fixedDeductions"];
  firstName: string;
  lastName: string;
  docType: Employee["docType"];
  docNumber: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  position: string;
  department: string;
  pointOfSaleId: string | null;
  contractType: Employee["contractType"];
  startDate: string;
  salary: number;
  integralSalary: boolean;
  transportAllowance: boolean;
  riskLevel: Employee["riskLevel"];
  eps: string;
  pensionFund: string;
  arlProvider: string;
  compensationFund: string;
  bank: string;
  accountType: "ahorros" | "corriente";
  accountNumber: string;
}

export interface NewCompanyInput {
  name: string;
  nit: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  legalRep: string;
  legalRepDoc: string;
  adminName: string;
  department?: string;
  economicActivity?: string;
  taxResponsibilities?: string;
  pointsOfSale?: RutPointOfSale[];
}

export interface AppContextValue {
  session: Session | null;
  authLoading: boolean;
  dataLoading: boolean;
  viewRole: Role;
  companies: Company[];
  employees: Employee[];
  payrolls: Payroll[];
  absences: Absence[];
  documents: GeneratedDocumentRecord[];
  accrualPayments: AccrualPayment[];
  settlements: SettlementRecord[];
  companySettlements: SettlementRecord[];
  employeeSignatures: Record<string, string>;
  companySuspensions: {
    employeeId: string;
    startDate: string;
    endDate: string;
    status: string;
  }[];
  saveEmployeeSignature: (employeeId: string, data: string) => Promise<void>;
  members: CompanyUser[];
  invites: CompanyInvite[];
  periodClosures: PayrollPeriodClosure[];
  period: string;
  currentCompany: Company | null;
  visibleCompanies: Company[];
  companyEmployees: Employee[];
  companyPayrolls: Payroll[];
  companyAbsences: Absence[];
  companyDocuments: GeneratedDocumentRecord[];
  currentEmployee: Employee | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  joinCompany: (code: string, mode: "admin" | "employee") => Promise<void>;
  impersonateCompany: (companyId: string) => void;
  returnToOwner: () => void;
  setPeriod: (period: string) => void;
  refresh: () => Promise<void>;
  addEmployee: (input: NewEmployeeInput) => Promise<Employee | null>;
  updateEmployee: (id: string, input: Partial<Employee>) => Promise<boolean>;
  reactivateEmployee: (id: string) => Promise<boolean>;
  retireEmployee: (
    id: string,
    options?: { endDate?: string; reason?: string },
  ) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addCompany: (input: NewCompanyInput) => Promise<void>;
  updateCompany: (id: string, input: Partial<Company>) => Promise<void>;
  toggleCompanyStatus: (id: string) => Promise<void>;
  addConcept: (concept: SalaryConcept) => Promise<void>;
  removeConcept: (conceptId: string) => Promise<void>;
  applyAnnualParameters: (input: {
    year: number;
    smmlv: number;
    transportAllowance: number;
    uvt: number;
    raiseSmmlvSalaries: boolean;
  }) => Promise<void>;
  generatePayroll: (
    period: string,
    novelties?: Record<string, PayrollNovelties>,
    paymentDate?: string,
    fortnight?: 1 | 2,
    employeeId?: string,
    force?: boolean,
    carriedExtras?: Record<string, { label: string; amount: number }[]>,
    mode?: "new" | "recalculate",
  ) => Promise<number>;
  deletePayroll: (payrollId: string) => Promise<void>;
  payPayrollFortnight: (
    period: string,
    fortnight: 1 | 2,
    ids?: string[],
  ) => Promise<boolean>;
  deletePayrollFortnight: (
    period: string,
    fortnight: 1 | 2,
    ids?: string[],
  ) => Promise<void>;
  updatePayrollFortnightDate: (
    period: string,
    fortnight: 1 | 2,
    paymentDate: string,
    ids?: string[],
  ) => Promise<void>;
  updatePayrollLine: (
    payrollId: string,
    lineId: string,
    amount: number,
  ) => Promise<void>;
  addPayrollLine: (
    payrollId: string,
    line: Omit<PayrollLine, "id">,
  ) => Promise<void>;
  removePayrollLine: (payrollId: string, lineId: string) => Promise<void>;
  setPayrollStatus: (payrollId: string, status: PayrollStatus) => Promise<void>;
  reopenPaidPayroll: (payrollId: string, reason: string) => Promise<boolean>;
  finalizePayrollPeriod: (period: string) => Promise<void>;
  addAccrualPayment: (input: {
    employeeId: string;
    concept: AccrualConcept;
    amount: number;
    days: number;
    paidAt: string;
    notes: string;
  }) => Promise<void>;
  deleteAccrualPayment: (id: string) => Promise<void>;
  saveSettlement: (input: SettlementSaveInput) => Promise<boolean>;
  saveSettlements: (inputs: SettlementSaveInput[]) => Promise<number>;
  deleteSettlement: (id: string) => Promise<void>;
  reopenPayrollPeriod: (period: string) => Promise<void>;
  updateAbsence: (
    id: string,
    patch: {
      type?: AbsenceType;
      startDate?: string;
      endDate?: string;
      days?: number;
      notes?: string;
    },
  ) => Promise<void>;
  deleteAbsence: (id: string) => Promise<void>;
  addAbsence: (input: {
    employeeId: string;
    type: AbsenceType;
    startDate: string;
    endDate: string;
    days: number;
    notes: string;
    status?: Absence["status"];
  }) => Promise<void>;
  setAbsenceStatus: (
    id: string,
    status: Absence["status"],
  ) => Promise<void>;
  addDocument: (input: {
    employeeId: string;
    kind: DocumentKind;
    title: string;
    status?: DocumentStatus;
    clause?: string;
  }) => Promise<void>;
  setDocumentStatus: (id: string, status: DocumentStatus) => Promise<void>;
  createCompanyUser: (input: {
    companyId: string;
    role: "admin" | "employee";
    name: string;
    email: string;
    employeeId: string | null;
    password?: string;
  }) => Promise<{
    created: boolean;
    email: string;
    password: string | null;
    message?: string;
  } | null>;
  resetCompanyUserPassword: (
    memberId: string,
    password?: string,
  ) => Promise<{ email: string; password: string } | null>;
  inviteUser: (input: {
    companyId: string;
    name: string;
    email: string;
    role: "admin" | "employee";
    employeeId: string | null;
  }) => Promise<void>;
  cancelInvite: (id: string) => Promise<void>;
  revokeMember: (id: string) => Promise<void>;
}
export const AppContext = createContext<AppContextValue | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp debe usarse dentro de AppProvider");
  }
  return context;
};
