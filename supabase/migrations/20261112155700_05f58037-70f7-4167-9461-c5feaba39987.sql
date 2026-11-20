alter table public.payroll_payrolls
  drop constraint if exists payroll_payrolls_employee_id_period_key;

alter table public.payroll_payrolls
  add constraint payroll_payrolls_employee_period_fortnight_key
  unique (employee_id, period, fortnight);