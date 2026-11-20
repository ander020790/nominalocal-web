alter table public.payroll_documents
  add column if not exists extra_clause text not null default '';