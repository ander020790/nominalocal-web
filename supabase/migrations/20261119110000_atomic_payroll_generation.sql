-- Generación y recálculo atómico de nóminas.
CREATE OR REPLACE FUNCTION public.payroll_save_batch(
  p_company_id uuid,
  p_period text,
  p_fortnight smallint,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_row jsonb;
  v_employee uuid;
  v_existing record;
  v_created integer := 0;
  v_updated integer := 0;
  v_seen uuid[] := ARRAY[]::uuid[];
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.payroll_can_manage(p_company_id) THEN
    RAISE EXCEPTION 'No tiene permisos para gestionar esta nómina';
  END IF;

  IF p_company_id IS NULL
     OR p_period IS NULL
     OR p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
     OR p_fortnight NOT IN (1, 2)
     OR p_fortnight IS NULL
     OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'Parámetros de nómina inválidos';
  END IF;

  -- Serializar operaciones sobre la empresa.
  PERFORM 1
  FROM public.payroll_companies
  WHERE id = p_company_id
  FOR NO KEY UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payroll_period_closures
    WHERE company_id = p_company_id AND period = p_period
  ) THEN
    RAISE EXCEPTION 'El período está cerrado';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(v_row) IS DISTINCT FROM 'object'
       OR v_row->>'employee_id' IS NULL THEN
      RAISE EXCEPTION 'Fila de nómina inválida';
    END IF;

    IF jsonb_typeof(v_row->'lines') IS DISTINCT FROM 'array'
       OR jsonb_typeof(v_row->'novelties') IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_row->'ibc') IS DISTINCT FROM 'number'
       OR (v_row->>'ibc')::numeric < 0
       OR jsonb_typeof(v_row->'days_worked') IS DISTINCT FROM 'number'
       OR (v_row->>'days_worked')::numeric NOT BETWEEN 0 AND 15
       OR (v_row->>'days_worked')::numeric <>
          trunc((v_row->>'days_worked')::numeric) THEN
      RAISE EXCEPTION 'Valores de liquidación inválidos';
    END IF;

    v_employee := (v_row->>'employee_id')::uuid;

    IF v_employee = ANY(v_seen) THEN
      RAISE EXCEPTION 'Empleado duplicado en el lote';
    END IF;

    v_seen := array_append(v_seen, v_employee);

    IF NOT EXISTS (
      SELECT 1
      FROM public.payroll_employees
      WHERE id = v_employee AND company_id = p_company_id
    ) THEN
      RAISE EXCEPTION 'El empleado no pertenece a la empresa';
    END IF;

    SELECT id, status INTO v_existing
    FROM public.payroll_payrolls
    WHERE employee_id = v_employee
      AND period = p_period
      AND fortnight = p_fortnight
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing.status <> 'borrador' THEN
        RAISE EXCEPTION
          'No se puede recalcular una nómina revisada o pagada';
      END IF;

      UPDATE public.payroll_payrolls
      SET lines = (v_row->'lines'),
          ibc = (v_row->>'ibc')::numeric,
          payment_date = (v_row->>'payment_date')::date,
          days_worked = (v_row->>'days_worked')::smallint,
          novelties = COALESCE(v_row->'novelties', '{}'::jsonb)
      WHERE id = v_existing.id;

      v_updated := v_updated + 1;
    ELSE
      INSERT INTO public.payroll_payrolls (
        company_id, employee_id, period, fortnight,
        status, lines, ibc, payment_date, days_worked, novelties
      )
      VALUES (
        p_company_id,
        v_employee,
        p_period,
        p_fortnight,
        'borrador',
        v_row->'lines',
        (v_row->>'ibc')::numeric,
        (v_row->>'payment_date')::date,
        (v_row->>'days_worked')::smallint,
        COALESCE(v_row->'novelties', '{}'::jsonb)
      );

      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'recalculated', v_updated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.payroll_save_batch(
  uuid, text, smallint, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.payroll_save_batch(
  uuid, text, smallint, jsonb
) TO authenticated;
