alter table public.payroll_payrolls
  add column if not exists payment_date date;