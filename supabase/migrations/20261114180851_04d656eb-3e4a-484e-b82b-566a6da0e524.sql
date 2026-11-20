create table if not exists public.payroll_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  cutoff date not null default current_date,
  pending_salary_days numeric not null default 0,
  vacation_days numeric not null default 0,
  other_earnings numeric not null default 0,
  other_deductions numeric not null default 0,
  extra_earnings jsonb not null default '[]'::jsonb,
  lines jsonb not null default '[]'::jsonb,
  prior_payments jsonb not null default '[]'::jsonb,
  gross numeric not null default 0,
  legal_deductions numeric not null default 0,
  total_deductions numeric not null default 0,
  net numeric not null default 0,
  days_year integer not null default 0,
  days_semester integer not null default 0,
  notes text not null default '',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payroll_settlements_employee_cutoff_key
  on public.payroll_settlements (employee_id, cutoff);

alter table public.payroll_settlements enable row level security;

create policy payroll_settlements_select on public.payroll_settlements
  for select using (payroll_can_manage(company_id));

create policy payroll_settlements_insert on public.payroll_settlements
  for insert with check (payroll_can_manage(company_id));

create policy payroll_settlements_update on public.payroll_settlements
  for update using (payroll_can_manage(company_id)) with check (payroll_can_manage(company_id));

create policy payroll_settlements_delete on public.payroll_settlements
  for delete using (payroll_can_manage(company_id));