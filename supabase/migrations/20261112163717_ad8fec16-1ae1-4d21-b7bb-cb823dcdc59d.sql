create table if not exists public.payroll_signatures (
  employee_id uuid primary key references public.payroll_employees(id) on delete cascade,
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  data text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.payroll_signatures enable row level security;

create policy payroll_signatures_select on public.payroll_signatures
  for select to authenticated
  using (payroll_can_manage(company_id) or employee_id = payroll_my_employee());

create policy payroll_signatures_insert on public.payroll_signatures
  for insert to authenticated
  with check (
    payroll_can_manage(company_id)
    or (employee_id = payroll_my_employee() and company_id = payroll_my_company())
  );

create policy payroll_signatures_update on public.payroll_signatures
  for update to authenticated
  using (payroll_can_manage(company_id) or employee_id = payroll_my_employee())
  with check (
    payroll_can_manage(company_id)
    or (employee_id = payroll_my_employee() and company_id = payroll_my_company())
  );

create policy payroll_signatures_delete on public.payroll_signatures
  for delete to authenticated
  using (payroll_can_manage(company_id));