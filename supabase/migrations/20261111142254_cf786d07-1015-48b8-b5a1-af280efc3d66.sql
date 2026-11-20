-- Limpieza de 3 registros duplicados del mismo empleado (misma empresa y documento),
-- creados en segundos consecutivos y sin nóminas, ausencias ni documentos asociados.
-- Se conserva el primero: a25895a3-b61b-4c5c-bf6f-7a8ebe190504.
delete from public.payroll_employees
 where id in (
   '1affab66-0525-4417-a524-7b76f697be77',
   '455d7254-1d82-422e-abcf-0bcea38c2e8f'
 );

-- Evita empleados activos duplicados por documento en la misma empresa
create unique index if not exists payroll_employees_company_doc_active
  on public.payroll_employees (
    company_id,
    regexp_replace(doc_number, '\D', '', 'g')
  )
  where status = 'activo';

-- Permite eliminar empleados a RRHH de la empresa
create policy payroll_employees_delete on public.payroll_employees
  for delete to authenticated
  using (payroll_can_manage(company_id));
