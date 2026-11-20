-- NominaLocal: coordinar la reapertura de periodos mensuales.
-- Pendiente de pruebas antes de aplicar.

CREATE OR REPLACE FUNCTION public.payroll_protect_period_reopening()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Coordinar la reapertura con las operaciones de la empresa.
  PERFORM 1
  FROM public.payroll_companies
  WHERE id = OLD.company_id
  FOR NO KEY UPDATE;

  RETURN OLD;
END;
$$;

CREATE TRIGGER payroll_protect_period_reopening_delete
BEFORE DELETE ON public.payroll_period_closures
FOR EACH ROW
EXECUTE FUNCTION public.payroll_protect_period_reopening();
