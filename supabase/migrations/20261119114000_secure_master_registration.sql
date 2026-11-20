-- Windows: impedir la asignación automática del rol MASTER.
-- El propietario se provisionará durante la instalación autorizada.

create or replace function public.payroll_register_profile(
  p_name text default null
)
returns public.payroll_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.payroll_members;
  v_email text;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select *
    into v_member
    from public.payroll_members
   where user_id = auth.uid();

  if v_member.id is not null then
    return v_member;
  end if;

  select email
    into v_email
    from auth.users
   where id = auth.uid();

  if v_email is null then
    raise exception 'Usuario sin correo electrónico';
  end if;

  v_name := coalesce(
    nullif(trim(p_name), ''),
    split_part(v_email, '@', 1)
  );

  insert into public.payroll_members (
    user_id,
    email,
    name,
    role
  )
  values (
    auth.uid(),
    v_email,
    v_name,
    'pending'
  )
  returning * into v_member;

  return v_member;
end;
$$;
