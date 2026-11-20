-- NominaLocal: garantizar que cada nomina
-- pertenezca a la misma empresa que su empleado.

ALTER TABLE public.payroll_employees
ADD CONSTRAINT payroll_employees_id_company_unique
UNIQUE (id, company_id);

ALTER TABLE public.payroll_payrolls
ADD CONSTRAINT payroll_payrolls_employee_company_fkey
FOREIGN KEY (employee_id, company_id)
REFERENCES public.payroll_employees (id, company_id)
ON DELETE NO ACTION;
