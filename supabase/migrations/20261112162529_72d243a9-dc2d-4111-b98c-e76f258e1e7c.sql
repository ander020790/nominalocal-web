alter policy payroll_payrolls_select on public.payroll_payrolls
  using (
    payroll_can_manage(company_id)
    or (
      payroll_my_role() = 'employee'
      and employee_id = payroll_my_employee()
      and status in ('revisado', 'pagado')
    )
  );