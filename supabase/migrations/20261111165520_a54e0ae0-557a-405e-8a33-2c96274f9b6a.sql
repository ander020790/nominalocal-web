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
  if not (payroll_can_manage(p_company_id) or payroll_my_company() = p_company_id) then
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