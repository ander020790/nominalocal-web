-- Entidad administradora de riesgos laborales (ARL) del empleado
alter table public.payroll_employees
  add column if not exists arl_provider text not null default '';
