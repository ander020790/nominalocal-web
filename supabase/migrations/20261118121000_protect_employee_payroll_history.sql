-- Conservar empleados que tengan historial de nómina.
-- Aplica a nóminas en cualquier estado.

CREATE OR REPLACE FUNCTION public.protect_employee_payroll_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payroll_payrolls
    WHERE employee_id = OLD.id
  ) THEN
    RAISE EXCEPTION
      'No se puede eliminar un empleado con historial de nómina'
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_employee_payroll_history_delete
BEFORE DELETE ON public.payroll_employees
FOR EACH ROW
EXECUTE FUNCTION public.protect_employee_payroll_history();
