alter table public.payroll_employees
  add column if not exists termination_reason text not null default '';