-- NominaLocal: proteger el cierre mensual.
-- Esta migración se probará antes de aplicarse.

CREATE OR REPLACE FUNCTION public.payroll_validate_period_closure()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
BEGIN
  IF NEW.period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'El periodo debe tener formato AAAA-MM';
  END IF;

  v_start := to_date(NEW.period || '-01', 'YYYY-MM-DD');
  v_end := (v_start + interval '1 month - 1 day')::date;

  -- Serializar cierres y operaciones de nómina por empresa.
  PERFORM 1
  FROM public.payroll_companies
  WHERE id = NEW.company_id
  FOR NO KEY UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.payroll_employees e
    CROSS JOIN (VALUES (1), (2)) AS q(fortnight)
    LEFT JOIN public.payroll_payrolls p
      ON p.employee_id = e.id
      AND p.company_id = NEW.company_id
      AND p.period = NEW.period
      AND p.fortnight = q.fortnight
    WHERE e.company_id = NEW.company_id
      AND e.start_date <=
        CASE WHEN q.fortnight = 1
          THEN v_start + 14
          ELSE v_end
        END
      AND (e.end_date IS NULL OR e.end_date >=
        CASE WHEN q.fortnight = 1
          THEN v_start
          ELSE v_start + 15
        END)
      AND (p.id IS NULL OR p.status <> 'pagado')
  ) THEN
    RAISE EXCEPTION
      'No se puede cerrar el periodo: existen quincenas sin pagar';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payroll_payrolls p
    WHERE p.company_id = NEW.company_id
      AND p.period = NEW.period
      AND p.status <> 'pagado'
  ) THEN
    RAISE EXCEPTION
      'No se puede cerrar el periodo: existen nominas pendientes';
  END IF;

  -- No permitir cierres de meses sin nominas registradas.
  IF NOT EXISTS (
    SELECT 1
    FROM public.payroll_payrolls p
    WHERE p.company_id = NEW.company_id
      AND p.period = NEW.period
  ) THEN
    RAISE EXCEPTION
      'No se puede cerrar el periodo: no existen nominas registradas';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payroll_validate_period_closure_insert
BEFORE INSERT ON public.payroll_period_closures
FOR EACH ROW
EXECUTE FUNCTION public.payroll_validate_period_closure();
