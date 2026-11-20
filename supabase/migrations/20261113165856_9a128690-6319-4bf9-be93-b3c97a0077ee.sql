alter table public.payroll_payrolls
  add column if not exists novelties jsonb not null default '{}'::jsonb;