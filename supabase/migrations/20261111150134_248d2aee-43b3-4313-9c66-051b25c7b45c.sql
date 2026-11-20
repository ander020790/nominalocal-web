-- Revertir la asignación temporal usada para crear la cuenta de Alfonso
update public.payroll_members
   set role = 'pending',
       company_id = null,
       employee_id = null
 where email = 'qa.emp.1794323159@example.com';
