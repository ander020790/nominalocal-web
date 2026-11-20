-- NominaLocal: impedir modificaciones directas de cierres mensuales.

CREATE OR REPLACE FUNCTION public.payroll_block_period_closure_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'No se permite modificar un cierre mensual. Debe reabrirse el periodo mediante el procedimiento autorizado';
END;
$$;

CREATE TRIGGER payroll_block_period_closure_update
BEFORE UPDATE ON public.payroll_period_closures
FOR EACH ROW
EXECUTE FUNCTION public.payroll_block_period_closure_updates();
