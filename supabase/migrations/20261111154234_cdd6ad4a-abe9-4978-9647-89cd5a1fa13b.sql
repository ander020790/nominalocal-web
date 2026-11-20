-- Imagen de la firma del representante legal (data URL PNG)
alter table public.payroll_companies
  add column if not exists signature_data text not null default '';
