-- Limpieza de los datos de verificación creados por QA (empresa temporal y cuentas de prueba)
update public.payroll_members
   set role = 'pending', company_id = null, employee_id = null
 where email in ('qa.owner.1794323159@example.com', 'qa.emp.1794323159@example.com');

delete from public.payroll_companies
 where name = 'QA Empresa 1794323159';
