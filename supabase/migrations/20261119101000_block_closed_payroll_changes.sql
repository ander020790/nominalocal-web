-- NominaLocal: proteger nominas de periodos cerrados.
-- Pendiente de pruebas antes de aplicar.

CREATE OR REPLACE FUNCTION public.payroll_block_closed_period_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_period text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company := NEW.company_id;
    v_period := NEW.period;
  ELSE
    v_company := OLD.company_id;
    v_period := OLD.period;
  END IF;

  -- Bloquear la empresa para coordinar operaciones simultaneas.
  PERFORM 1
  FROM public.payroll_companies
  WHERE id = v_company
  FOR NO KEY UPDATE;

  -- Comprobar el periodo original.
  IF EXISTS (
    SELECT 1
    FROM public.payroll_period_closures
    WHERE company_id = v_company
      AND period = v_period
  ) THEN
    RAISE EXCEPTION
      'No se puede modificar una nomina de un periodo cerrado';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- No permitir cambiar una nomina hacia un periodo cerrado.
    IF EXISTS (
      SELECT 1
      FROM public.payroll_period_closures
      WHERE company_id = NEW.company_id
        AND period = NEW.period
    ) THEN
      RAISE EXCEPTION
        'No se puede trasladar una nomina a un periodo cerrado';
    END IF;

    -- Evitar trasladar nominas entre empresas.
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION
        'No se permite cambiar la empresa de una nomina';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payroll_block_closed_period_insert
BEFORE INSERT ON public.payroll_payrolls
FOR EACH ROW
EXECUTE FUNCTION public.payroll_block_closed_period_changes();

CREATE TRIGGER payroll_block_closed_period_update
BEFORE UPDATE ON public.payroll_payrolls
FOR EACH ROW
EXECUTE FUNCTION public.payroll_block_closed_period_changes();

CREATE TRIGGER payroll_block_closed_period_delete
BEFORE DELETE ON public.payroll_payrolls
FOR EACH ROW
EXECUTE FUNCTION public.payroll_block_closed_period_changes();
