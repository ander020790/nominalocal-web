alter table public.payroll_payrolls
  add column if not exists days_worked smallint;