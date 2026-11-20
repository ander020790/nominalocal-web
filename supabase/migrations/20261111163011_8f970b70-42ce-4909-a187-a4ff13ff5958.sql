-- Pagos parciales de cesantías, vacaciones o prima por empleado
create table if not exists public.payroll_accrual_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  concept text not null check (concept in ('cesantias','vacaciones','prima')),
  amount numeric not null default 0,
  days numeric not null default 0,
  paid_at date not null default current_date,
  notes text not null default '',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists payroll_accrual_payments_company_idx
  on public.payroll_accrual_payments (company_id, employee_id);

alter table public.payroll_accrual_payments enable row level security;

create policy payroll_accrual_payments_select on public.payroll_accrual_payments
  for select to authenticated using (payroll_can_manage(company_id));
create policy payroll_accrual_payments_insert on public.payroll_accrual_payments
  for insert to authenticated with check (payroll_can_manage(company_id));
create policy payroll_accrual_payments_delete on public.payroll_accrual_payments
  for delete to authenticated using (payroll_can_manage(company_id));
