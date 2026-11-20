-- Gestión de usuarios por parte del usuario principal: invitaciones por correo
create table if not exists public.payroll_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null check (role in ('admin','employee')),
  employee_id uuid references public.payroll_employees(id) on delete set null,
  invited_by uuid not null default auth.uid(),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists payroll_invites_email_pending
  on public.payroll_invites (lower(email))
  where accepted_at is null;

create index if not exists payroll_invites_company_idx
  on public.payroll_invites (company_id);

alter table public.payroll_invites enable row level security;

create policy payroll_invites_select on public.payroll_invites
  for select to authenticated using (payroll_is_owner());
create policy payroll_invites_insert on public.payroll_invites
  for insert to authenticated with check (payroll_is_owner());
create policy payroll_invites_delete on public.payroll_invites
  for delete to authenticated using (payroll_is_owner());

create policy payroll_members_delete on public.payroll_members
  for delete to authenticated using (payroll_is_owner());

create or replace function public.payroll_register_profile(p_name text default null)
returns public.payroll_members language plpgsql security definer set search_path = public as $$
declare
  v_member public.payroll_members;
  v_invite public.payroll_invites;
  v_email text;
  v_owner boolean;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select * into v_member from payroll_members where user_id = auth.uid();
  select email into v_email from auth.users where id = auth.uid();

  if v_member.id is not null then
    if v_member.role = 'pending' then
      select * into v_invite from payroll_invites
       where lower(email) = lower(v_email) and accepted_at is null
       order by created_at limit 1;
      if v_invite.id is not null then
        update payroll_members
           set role = v_invite.role,
               company_id = v_invite.company_id,
               employee_id = v_invite.employee_id,
               name = coalesce(nullif(v_member.name, ''), v_invite.name)
         where id = v_member.id
         returning * into v_member;
        update payroll_invites set accepted_at = now() where id = v_invite.id;
      end if;
    end if;
    return v_member;
  end if;

  select * into v_invite from payroll_invites
   where lower(email) = lower(v_email) and accepted_at is null
   order by created_at limit 1;
  v_name := coalesce(nullif(p_name, ''), v_invite.name, split_part(v_email, '@', 1));

  if v_invite.id is not null then
    insert into payroll_members (user_id, email, name, role, company_id, employee_id)
    values (auth.uid(), v_email, v_name, v_invite.role, v_invite.company_id, v_invite.employee_id)
    returning * into v_member;
    update payroll_invites set accepted_at = now() where id = v_invite.id;
    return v_member;
  end if;

  select exists (select 1 from payroll_members where role = 'owner') into v_owner;

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

create or replace function public.payroll_accept_invite()
returns public.payroll_members language plpgsql security definer set search_path = public as $$
declare
  v_member public.payroll_members;
  v_invite public.payroll_invites;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select * into v_member from payroll_members where user_id = auth.uid();
  if v_member.id is null or v_member.role <> 'pending' then
    return v_member;
  end if;

  select email into v_email from auth.users where id = auth.uid();
  select * into v_invite from payroll_invites
   where lower(email) = lower(v_email) and accepted_at is null
   order by created_at limit 1;
  if v_invite.id is null then
    return v_member;
  end if;

  update payroll_members
     set role = v_invite.role,
         company_id = v_invite.company_id,
         employee_id = v_invite.employee_id,
         name = coalesce(nullif(v_member.name, ''), v_invite.name)
   where id = v_member.id
   returning * into v_member;

  update payroll_invites set accepted_at = now() where id = v_invite.id;
  return v_member;
end;
$$;

create or replace function public.payroll_join_company(p_code text, p_mode text)
returns public.payroll_members language plpgsql security definer set search_path = public as $$
declare
  v_member public.payroll_members;
  v_company public.payroll_companies;
  v_employee uuid;
  v_invite public.payroll_invites;
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida';
  end if;

  select * into v_member from payroll_members where user_id = auth.uid();
  if v_member.id is null then
    raise exception 'No encontramos tu perfil de usuario';
  end if;
  if v_member.role <> 'pending' then
    raise exception 'Tu usuario ya está vinculado a una empresa';
  end if;

  select * into v_company from payroll_companies
   where access_code = upper(trim(p_code)) and status = 'activa';
  if v_company.id is null then
    raise exception 'Código de empresa no válido o empresa inactiva';
  end if;

  if p_mode = 'admin' then
    select * into v_invite from payroll_invites
     where lower(email) = lower(v_member.email)
       and accepted_at is null
       and company_id = v_company.id;
    if v_invite.id is null then
      raise exception 'El acceso de administrador lo asigna el usuario principal.';
    end if;
    update payroll_members
       set role = 'admin', company_id = v_company.id, employee_id = v_invite.employee_id
     where id = v_member.id
     returning * into v_member;
    update payroll_invites set accepted_at = now() where id = v_invite.id;
  elsif p_mode = 'employee' then
    select id into v_employee from payroll_employees
     where company_id = v_company.id
       and lower(email) = lower(v_member.email)
       and status = 'activo'
     limit 1;
    if v_employee is null then
      raise exception 'Tu correo no está registrado como empleado activo de esta empresa';
    end if;
    update payroll_members
       set role = 'employee', company_id = v_company.id, employee_id = v_employee
     where id = v_member.id
     returning * into v_member;
  else
    raise exception 'Modalidad de acceso no válida';
  end if;

  return v_member;
end;
$$;

grant execute on function public.payroll_accept_invite() to authenticated;
grant execute on function public.payroll_register_profile(text) to authenticated;
grant execute on function public.payroll_join_company(text, text) to authenticated;
