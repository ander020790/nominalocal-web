-- Tipo de documento de contrato que corresponde a cada tipo de contrato
create or replace function public.payroll_contract_kind(p_type text)
returns text language sql immutable as $$
  select case p_type
    when 'indefinido' then 'contrato-indefinido'
    when 'fijo' then 'contrato-fijo'
    when 'obra-labor' then 'contrato-obra-labor'
    when 'prestacion-servicios' then 'contrato-prestacion-servicios'
  end;
$$;

-- Impide registrar un contrato distinto al asignado en la ficha
create or replace function public.payroll_documents_validate_contract()
returns trigger language plpgsql set search_path = public as $$
declare
  v_type text;
begin
  if new.kind like 'contrato-%' then
    select contract_type into v_type
      from payroll_employees where id = new.employee_id;
    if v_type is null then
      raise exception 'Empleado no encontrado para el contrato.';
    end if;
    if new.kind <> payroll_contract_kind(v_type) then
      raise exception 'El contrato debe coincidir con el tipo asignado en la ficha del empleado.';
    end if;
  end if;
  return new;
end;
$$;

create trigger payroll_documents_contract_check
  before insert or update of kind, employee_id on public.payroll_documents
  for each row execute function public.payroll_documents_validate_contract();

-- Si cambia el contrato en la ficha, alinea los documentos ya generados
create or replace function public.payroll_employees_sync_contracts()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.contract_type is distinct from old.contract_type then
    update payroll_documents
       set kind = payroll_contract_kind(new.contract_type),
           title = case new.contract_type
             when 'indefinido' then 'Contrato a término indefinido'
             when 'fijo' then 'Contrato a término fijo'
             when 'obra-labor' then 'Contrato por obra o labor'
             when 'prestacion-servicios' then 'Contrato de prestación de servicios'
           end
     where employee_id = new.id
       and kind like 'contrato-%';
  end if;
  return new;
end;
$$;

create trigger payroll_employees_sync_contracts
  after update of contract_type on public.payroll_employees
  for each row execute function public.payroll_employees_sync_contracts();
