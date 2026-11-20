-- Membrete corporativo: logo, codigo de formato, version y vigencia
alter table public.payroll_companies
  add column if not exists logo_data text not null default '',
  add column if not exists letterhead_code text not null default 'GH-FOR-01',
  add column if not exists letterhead_version text not null default '01',
  add column if not exists letterhead_validity text not null default '';

-- Consecutivos por empresa y tipo de documento
create table if not exists public.payroll_document_sequences (
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  kind text not null,
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, kind)
);

alter table public.payroll_document_sequences enable row level security;

create policy payroll_document_sequences_select on public.payroll_document_sequences
  for select to authenticated using (payroll_can_manage(company_id));
create policy payroll_document_sequences_insert on public.payroll_document_sequences
  for insert to authenticated with check (payroll_can_manage(company_id));
create policy payroll_document_sequences_update on public.payroll_document_sequences
  for update to authenticated using (payroll_can_manage(company_id))
  with check (payroll_can_manage(company_id));

create or replace function public.payroll_next_document_number(
  p_company_id uuid,
  p_kind text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if not payroll_can_manage(p_company_id) then
    raise exception 'No tienes permisos para numerar documentos de esta empresa';
  end if;

  insert into public.payroll_document_sequences as seq (company_id, kind, last_number)
  values (p_company_id, p_kind, 1)
  on conflict (company_id, kind) do update
    set last_number = seq.last_number + 1,
        updated_at = now()
  returning last_number into v_next;

  return v_next;
end;
$$;

revoke all on function public.payroll_next_document_number(uuid, text) from public;
grant execute on function public.payroll_next_document_number(uuid, text) to authenticated;