-- Protección de nóminas pagadas.
-- Una nómina previamente pagada no puede modificarse
-- ni eliminarse mediante operaciones ordinarias.

CREATE OR REPLACE FUNCTION public.protect_paid_payroll()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'pagado' THEN
    RAISE EXCEPTION
      'No se permite modificar o eliminar una nómina pagada'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF OLD.status = 'borrador'
     AND NEW.status = 'pagado' THEN
    RAISE EXCEPTION
      'La nómina debe estar revisada antes de marcarse como pagada'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_paid_payroll_update
BEFORE UPDATE ON public.payroll_payrolls
FOR EACH ROW
EXECUTE FUNCTION public.protect_paid_payroll();

CREATE TRIGGER protect_paid_payroll_delete
BEFORE DELETE ON public.payroll_payrolls
FOR EACH ROW
EXECUTE FUNCTION public.protect_paid_payroll();
