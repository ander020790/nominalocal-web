alter table public.payroll_payrolls
  add column if not exists fortnight smallint not null default 1
  check (fortnight in (1, 2));

create index if not exists payroll_payrolls_fortnight_idx
  on public.payroll_payrolls (company_id, period, fortnight);