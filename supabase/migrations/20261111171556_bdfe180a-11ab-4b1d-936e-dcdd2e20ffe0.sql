alter table public.payroll_accrual_payments
  drop constraint if exists payroll_accrual_payments_concept_check;

alter table public.payroll_accrual_payments
  add constraint payroll_accrual_payments_concept_check
  check (concept in ('cesantias', 'vacaciones', 'prima', 'intereses'));