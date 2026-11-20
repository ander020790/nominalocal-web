create policy payroll_absences_employee_update on public.payroll_absences
  for update to authenticated
  using (employee_id = payroll_my_employee() and status = 'pendiente')
  with check (employee_id = payroll_my_employee() and status = 'pendiente');

create policy payroll_absences_employee_delete on public.payroll_absences
  for delete to authenticated
  using (employee_id = payroll_my_employee() and status = 'pendiente');

create policy payroll_absences_manager_delete on public.payroll_absences
  for delete to authenticated
  using (payroll_can_manage(company_id));