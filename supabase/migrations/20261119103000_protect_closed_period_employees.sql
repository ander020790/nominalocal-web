-- NominaLocal: proteger la integridad de los periodos cerrados.
-- Esta migracion debe probarse antes de aplicarse.

CREATE OR REPLACE FUNCTION public.payroll_protect_closed_period_employees()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company := NEW.company_id;
  ELSE
    v_company := OLD.company_id;
  END IF;

  -- Coordinar con los cierres mensuales de la empresa.
  PERFORM 1
  FROM public.payroll_companies
  WHERE id = v_company
  FOR NO KEY UPDATE;

  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1
      FROM public.payroll_period_closures c
      WHERE c.company_id = NEW.company_id
        AND NEW.start_date <
          (to_date(c.period || '-01', 'YYYY-MM-DD')
           + interval '1 month')::date
    ) THEN
      RAISE EXCEPTION
        'No se puede registrar un empleado con ingreso en un periodo cerrado';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1
      FROM public.payroll_period_closures
      WHERE company_id = OLD.company_id
    ) THEN
      RAISE EXCEPTION
        'No se puede eliminar un empleado con periodos cerrados';
    END IF;

    RETURN OLD;
  END IF;

  -- Impedir traslados de empleados entre empresas.
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION
      'No se permite trasladar empleados entre empresas';
  END IF;

  -- Mantener coherencia entre estado laboral y fecha de retiro.
  IF NEW.status = 'retirado' AND NEW.end_date IS NULL THEN
    RAISE EXCEPTION
      'Un empleado retirado debe tener fecha de retiro';
  END IF;

  IF NEW.status = 'activo' AND NEW.end_date IS NOT NULL THEN
    RAISE EXCEPTION
      'Un empleado activo no puede tener fecha de retiro';
  END IF;

  -- La fecha de ingreso de un empleado con historia cerrada
  -- no puede modificarse.
  IF NEW.start_date IS DISTINCT FROM OLD.start_date
     AND EXISTS (
       SELECT 1
       FROM public.payroll_period_closures c
       WHERE c.company_id = OLD.company_id
         AND OLD.start_date <
           (to_date(c.period || '-01', 'YYYY-MM-DD')
            + interval '1 month')::date
     ) THEN
    RAISE EXCEPTION
      'No se puede cambiar la fecha de ingreso con historia cerrada';
  END IF;

  -- Se permite registrar retiros posteriores al ultimo cierre,
  -- pero no alterar la situacion laboral de meses cerrados.
  IF (
    NEW.end_date IS DISTINCT FROM OLD.end_date
    OR NEW.status IS DISTINCT FROM OLD.status
  ) AND EXISTS (
    SELECT 1
    FROM public.payroll_period_closures c
    WHERE c.company_id = OLD.company_id
      AND (
        -- La nueva fecha de retiro cae dentro o antes del cierre.
        (
          NEW.end_date IS NOT NULL
          AND NEW.end_date <
            (to_date(c.period || '-01', 'YYYY-MM-DD')
             + interval '1 month')::date
        )
        OR
        -- Una fecha de retiro anterior ya estaba protegida.
        (
          OLD.end_date IS NOT NULL
          AND OLD.end_date <
            (to_date(c.period || '-01', 'YYYY-MM-DD')
             + interval '1 month')::date
        )
      )
  ) THEN
    RAISE EXCEPTION
      'No se puede modificar un retiro que afecta periodos cerrados';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payroll_protect_closed_employees_insert
BEFORE INSERT ON public.payroll_employees
FOR EACH ROW
EXECUTE FUNCTION public.payroll_protect_closed_period_employees();

CREATE TRIGGER payroll_protect_closed_employees_update
BEFORE UPDATE ON public.payroll_employees
FOR EACH ROW
EXECUTE FUNCTION public.payroll_protect_closed_period_employees();

CREATE TRIGGER payroll_protect_closed_employees_delete
BEFORE DELETE ON public.payroll_employees
FOR EACH ROW
EXECUTE FUNCTION public.payroll_protect_closed_period_employees();
