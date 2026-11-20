-- Datos bancarios para el pago de nómina
alter table public.payroll_employees
  add column if not exists account_type text not null default 'ahorros'
  check (account_type in ('ahorros','corriente'));

alter table public.payroll_companies
  add column if not exists payroll_bank text not null default 'Bancolombia',
  add column if not exists payroll_account_type text not null default 'S'
    check (payroll_account_type in ('S','D')),
  add column if not exists payroll_account_number text not null default '';

-- Cierre de nómina por periodo
create table if not exists public.payroll_period_closures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  period text not null,
  closed_by uuid not null default auth.uid(),
  closed_at timestamptz not null default now(),
  unique (company_id, period)
);

alter table public.payroll_period_closures enable row level security;

create policy payroll_period_closures_select on public.payroll_period_closures
  for select to authenticated using (payroll_can_manage(company_id));
create policy payroll_period_closures_insert on public.payroll_period_closures
  for insert to authenticated with check (payroll_can_manage(company_id));
create policy payroll_period_closures_delete on public.payroll_period_closures
  for delete to authenticated using (payroll_can_manage(company_id));
