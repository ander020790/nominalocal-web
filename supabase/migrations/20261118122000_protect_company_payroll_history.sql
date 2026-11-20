-- Impedir la eliminación de empresas con historial de nómina.
-- Utilizar el estado inactiva para conservar los registros.

CREATE OR REPLACE FUNCTION public.protect_company_payroll_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payroll_payrolls
    WHERE company_id = OLD.id
  ) THEN
    RAISE EXCEPTION
      'No se puede eliminar una empresa con historial de nómina'
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_company_payroll_history_delete
BEFORE DELETE ON public.payroll_companies
FOR EACH ROW
EXECUTE FUNCTION public.protect_company_payroll_history();
