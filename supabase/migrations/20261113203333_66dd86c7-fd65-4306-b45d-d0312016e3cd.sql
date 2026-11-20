create table if not exists public.payroll_warnings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  warning_date date not null default current_date,
  reason text not null default '',
  description text not null default '',
  severity text not null default 'leve'
    check (severity in ('leve', 'grave', 'muy-grave')),
  created_at timestamptz not null default now()
);

alter table public.payroll_warnings enable row level security;

create policy payroll_warnings_select on public.payroll_warnings
  for select to authenticated using (payroll_can_manage(company_id));
create policy payroll_warnings_insert on public.payroll_warnings
  for insert to authenticated with check (payroll_can_manage(company_id));
create policy payroll_warnings_update on public.payroll_warnings
  for update to authenticated using (payroll_can_manage(company_id))
  with check (payroll_can_manage(company_id));
create policy payroll_warnings_delete on public.payroll_warnings
  for delete to authenticated using (payroll_can_manage(company_id));