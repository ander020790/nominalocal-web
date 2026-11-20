-- Restringir la ejecución del guardado masivo de nóminas.
-- PUBLIC incluye los permisos heredados por anon.

REVOKE ALL ON FUNCTION public.payroll_save_batch(
  uuid, text, smallint, jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.payroll_save_batch(
  uuid, text, smallint, jsonb
) TO authenticated;
