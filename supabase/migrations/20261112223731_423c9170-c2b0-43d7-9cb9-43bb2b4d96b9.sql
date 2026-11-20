create table if not exists public.payroll_suspensions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days numeric not null default 0,
  reason text not null default '',
  notes text not null default '',
  status text not null default 'activa'
    check (status in ('activa', 'finalizada', 'cancelada')),
  created_at timestamptz not null default now()
);

create index if not exists payroll_suspensions_company_idx
  on public.payroll_suspensions (company_id, start_date desc);

alter table public.payroll_suspensions enable row level security;

create policy payroll_suspensions_select on public.payroll_suspensions
  for select to authenticated using (payroll_can_manage(company_id));
create policy payroll_suspensions_insert on public.payroll_suspensions
  for insert to authenticated with check (payroll_can_manage(company_id));
create policy payroll_suspensions_update on public.payroll_suspensions
  for update to authenticated using (payroll_can_manage(company_id))
  with check (payroll_can_manage(company_id));
create policy payroll_suspensions_delete on public.payroll_suspensions
  for delete to authenticated using (payroll_can_manage(company_id));