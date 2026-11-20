create policy payroll_payrolls_delete on public.payroll_payrolls
  for delete to authenticated using (payroll_can_manage(company_id));