-- NominaLocal: restringir privilegios administrativos
-- de usuarios autenticados sobre la tabla de nóminas.

REVOKE TRUNCATE, TRIGGER, REFERENCES
ON TABLE public.payroll_payrolls
FROM authenticated;
