create table if not exists public.payroll_loans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  amount numeric not null check (amount > 0),
  installments integer not null default 1 check (installments between 1 and 60),
  reason text not null default '',
  status text not null default 'solicitado'
    check (status in ('solicitado', 'aprobado', 'rechazado', 'pagado')),
  start_period text not null default '',
  note text not null default '',
  requested_at timestamptz not null default now(),
  requested_by uuid not null default auth.uid(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

create index if not exists payroll_loans_company_idx
  on public.payroll_loans (company_id, requested_at desc);
create index if not exists payroll_loans_employee_idx
  on public.payroll_loans (employee_id);

alter table public.payroll_loans enable row level security;

create policy payroll_loans_select on public.payroll_loans
  for select to authenticated
  using (payroll_can_manage(company_id) or employee_id = payroll_my_employee());

create policy payroll_loans_insert on public.payroll_loans
  for insert to authenticated
  with check (
    payroll_can_manage(company_id)
    or (employee_id = payroll_my_employee() and status = 'solicitado')
  );

create policy payroll_loans_update on public.payroll_loans
  for update to authenticated
  using (payroll_can_manage(company_id))
  with check (payroll_can_manage(company_id));

create policy payroll_loans_delete on public.payroll_loans
  for delete to authenticated
  using (payroll_can_manage(company_id));