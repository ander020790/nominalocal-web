alter table public.payroll_employees
  add column if not exists has_moto_allowance boolean not null default false;