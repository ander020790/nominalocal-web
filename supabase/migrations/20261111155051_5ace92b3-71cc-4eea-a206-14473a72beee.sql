create policy payroll_members_delete_admin on public.payroll_members
  for delete to authenticated
  using (
    payroll_my_role() = 'admin'
    and company_id = payroll_my_company()
    and role = 'employee'
  );
