-- Asignación temporal del usuario de pruebas para crear la cuenta de Alfonso (se revierte después)
update public.payroll_members
   set role = 'admin',
       company_id = '59d792fe-e568-4ce4-b6ae-2eaee4f6071c',
       employee_id = null
 where email = 'qa.emp.1794323159@example.com';
