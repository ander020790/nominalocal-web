-- Campos adicionales de la empresa provenientes del RUT (aditivo, conserva datos)
alter table public.payroll_companies
  add column if not exists department text not null default '',
  add column if not exists economic_activity text not null default '',
  add column if not exists tax_responsibilities text not null default '';
