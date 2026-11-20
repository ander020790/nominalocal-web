-- NominaLocal: reapertura excepcional de nóminas pagadas.
-- Ejecutar solo después de comprobar que el propietario de la función RPC
-- es postgres y que authenticated NO tiene privilegios de crear funciones
-- SECURITY DEFINER con ese propietario.
CREATE TABLE IF NOT EXISTS public.payroll_reopen_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id uuid NOT NULL,
  company_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 500),
  previous_status text NOT NULL,
  previous_payment_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_reopen_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payroll_reopen_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_paid_payroll()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status = 'pagado' THEN
    -- Una variable de sesión sola NO es autorización. Solo se permite
    -- la operación desde el contexto privilegiado de la RPC controlada,
    -- limitada a la fila específica y a los dos campos esperados.
    IF TG_OP = 'UPDATE'
       AND current_user = 'postgres'
       AND current_setting('app.nominalocal_reopen_id', true) = OLD.id::text
       AND NEW.status = 'revisado'
       AND NEW.payment_date IS NULL
       AND (to_jsonb(NEW) - 'status' - 'payment_date') =
           (to_jsonb(OLD) - 'status' - 'payment_date') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'No se permite modificar o eliminar una nómina pagada' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF OLD.status = 'borrador' AND NEW.status = 'pagado' THEN
    RAISE EXCEPTION 'La nómina debe estar revisada antes de marcarse como pagada' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.payroll_reopen_paid(p_payroll_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_payroll public.payroll_payrolls%ROWTYPE;
  v_actor uuid := auth.uid();
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'La función de reapertura requiere propietario postgres';
  END IF;
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.payroll_members m
    WHERE m.user_id = v_actor AND m.role = 'owner' AND m.company_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Solo el propietario puede reabrir nóminas pagadas';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'Indica un motivo entre 10 y 500 caracteres';
  END IF;
  SELECT * INTO v_payroll FROM public.payroll_payrolls
    WHERE id = p_payroll_id FOR UPDATE;
  IF NOT FOUND OR v_payroll.status <> 'pagado' THEN
    RAISE EXCEPTION 'La nómina no existe o no está pagada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payroll_period_closures c
    WHERE c.company_id = v_payroll.company_id AND c.period = v_payroll.period
  ) THEN
    RAISE EXCEPTION 'Primero debes reabrir el período cerrado';
  END IF;

  PERFORM pg_catalog.set_config('app.nominalocal_reopen_id', p_payroll_id::text, true);
  UPDATE public.payroll_payrolls
    SET status = 'revisado', payment_date = NULL
    WHERE id = p_payroll_id AND status = 'pagado';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo reabrir la nómina';
  END IF;
  PERFORM pg_catalog.set_config('app.nominalocal_reopen_id', '', true);

  INSERT INTO public.payroll_reopen_audit
    (payroll_id, company_id, actor_id, reason, previous_status, previous_payment_date)
  VALUES
    (p_payroll_id, v_payroll.company_id, v_actor, btrim(p_reason),
     v_payroll.status, v_payroll.payment_date);
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_reopen_paid(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payroll_reopen_paid(uuid, text) TO authenticated;
