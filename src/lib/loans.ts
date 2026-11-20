import type { EmployeeLoan, LoanStatus } from "@/data/types";
import type { Tables } from "@/integrations/supabase/types";

export const mapLoanRow = (row: Tables<"payroll_loans">): EmployeeLoan => ({
  id: row.id,
  companyId: row.company_id,
  employeeId: row.employee_id,
  amount: Number(row.amount),
  installments: row.installments,
  reason: row.reason,
  status: row.status as LoanStatus,
  startPeriod: row.start_period,
  note: row.note,
  requestedAt: row.requested_at,
  reviewedAt: row.reviewed_at,
});
