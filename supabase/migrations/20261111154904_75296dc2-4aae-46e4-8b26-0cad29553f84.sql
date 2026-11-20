-- Cláusulas editables por tipo de documento para cada empresa
alter table public.payroll_companies
  add column if not exists template_clauses jsonb not null default '{}'::jsonb;
