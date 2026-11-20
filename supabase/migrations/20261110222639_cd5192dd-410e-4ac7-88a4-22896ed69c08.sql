-- Solo el usuario principal crea y asigna cuentas: se cierra el auto-vinculo por código o invitación
create or replace function public.payroll_register_profile(p_name text default null)
returns public.payroll_members language plpgsql security definer set search_path = public as $$
declare
  v_member public.payroll_members;
  v_email text;
  v_owner boolean;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select * into v_member from payroll_members where user_id = auth.uid();
  if v_member.id is not null then
    return v_member;
  end if;

  select email into v_email from auth.users where id = auth.uid();
  select exists (select 1 from payroll_members where role = 'owner') into v_owner;
  v_name := coalesce(nullif(p_name, ''), split_part(v_email, '@', 1));

  if v_owner then
    insert into payroll_members (user_id, email, name, role)
    values (auth.uid(), v_email, v_name, 'pending')
    returning * into v_member;
  else
    begin
      insert into payroll_members (user_id, email, name, role)
      values (auth.uid(), v_email, v_name, 'owner')
      returning * into v_member;
    exception when unique_violation then
      insert into payroll_members (user_id, email, name, role)
      values (auth.uid(), v_email, v_name, 'pending')
      returning * into v_member;
    end;
  end if;

  return v_member;
end;
$$;

revoke execute on function public.payroll_join_company(text, text) from public;
revoke execute on function public.payroll_join_company(text, text) from authenticated;
revoke execute on function public.payroll_accept_invite() from public;
revoke execute on function public.payroll_accept_invite() from authenticated;
