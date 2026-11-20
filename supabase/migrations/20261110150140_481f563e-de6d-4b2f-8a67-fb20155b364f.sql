-- Nómina Clara: multiempresa (empresas independientes, nómina, documentos)

create table public.payroll_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nit text not null,
  city text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  legal_rep text not null default '',
  legal_rep_doc text not null default '',
  status text not null default 'activa' check (status in ('activa','inactiva')),
  access_code text not null unique default upper(substring(md5(random()::text), 1, 6)),
  params jsonb not null,
  concepts jsonb not null default '[]'::jsonb,
  points_of_sale jsonb not null default '[]'::jsonb,
  clauses text not null default '',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.payroll_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  doc_type text not null default 'CC',
  doc_number text not null default '',
  birth_date date,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  position text not null default '',
  department text not null default '',
  point_of_sale_id text,
  contract_type text not null default 'indefinido',
  start_date date not null default current_date,
  end_date date,
  salary numeric not null default 0,
  integral_salary boolean not null default false,
  transport_allowance boolean not null default false,
  risk_level text not null default 'I',
  eps text not null default '',
  pension_fund text not null default '',
  compensation_fund text not null default '',
  bank text not null default '',
  account_number text not null default '',
  status text not null default 'activo' check (status in ('activo','retirado')),
  fixed_earnings jsonb not null default '[]'::jsonb,
  fixed_deductions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index payroll_employees_company_idx on public.payroll_employees(company_id);

create table public.payroll_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'pending' check (role in ('owner','admin','employee','pending')),
  company_id uuid references public.payroll_companies(id) on delete set null,
  employee_id uuid references public.payroll_employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index payroll_members_single_owner on public.payroll_members (role) where role = 'owner';

create table public.payroll_payrolls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  period text not null,
  status text not null default 'borrador' check (status in ('borrador','revisado','pagado')),
  lines jsonb not null default '[]'::jsonb,
  ibc numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (employee_id, period)
);

create index payroll_payrolls_company_period_idx on public.payroll_payrolls(company_id, period);

create table public.payroll_absences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  type text not null default 'vacaciones' check (type in ('vacaciones','incapacidad','permiso','licencia')),
  start_date date not null,
  end_date date not null,
  days integer not null default 1,
  status text not null default 'pendiente' check (status in ('pendiente','aprobada','rechazada')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index payroll_absences_company_idx on public.payroll_absences(company_id);

create table public.payroll_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.payroll_companies(id) on delete cascade,
  employee_id uuid not null references public.payroll_employees(id) on delete cascade,
  kind text not null,
  title text not null,
  status text not null default 'generado' check (status in ('borrador','generado','firmado')),
  created_at timestamptz not null default now()
);

create index payroll_documents_company_idx on public.payroll_documents(company_id);

-- Funciones de apoyo (privilegios resueltos en el servidor)
create or replace function public.payroll_is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from payroll_members where user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.payroll_my_company()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from payroll_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.payroll_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from payroll_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.payroll_my_employee()
returns uuid language sql stable security definer set search_path = public as $$
  select employee_id from payroll_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.payroll_can_manage(target_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select payroll_is_owner()
    or exists (
      select 1 from payroll_members
      where user_id = auth.uid() and role = 'admin' and company_id = target_company
    );
$$;

-- Registro de perfil tras el alta de la cuenta: el servidor decide el rol
create or replace function public.payroll_register_profile(p_name text default null)
returns public.payroll_members language plpgsql security definer set search_path = public as $$
declare
  v_member public.payroll_members;
  v_email text;
  v_owner boolean;
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

  if v_owner then
    insert into payroll_members (user_id, email, name, role)
    values (auth.uid(), v_email, coalesce(nullif(p_name, ''), split_part(v_email, '@', 1)), 'pending')
    returning * into v_member;
  else
    begin
      insert into payroll_members (user_id, email, name, role)
      values (auth.uid(), v_email, coalesce(nullif(p_name, ''), split_part(v_email, '@', 1)), 'owner')
      returning * into v_member;
    exception when unique_violation then
      insert into payroll_members (user_id, email, name, role)
      values (auth.uid(), v_email, coalesce(nullif(p_name, ''), split_part(v_email, '@', 1)), 'pending')
      returning * into v_member;
    end;
  end if;

  return v_member;
end;
$$;

-- Vinculación de un usuario pendiente a una empresa con su código
create or replace function public.payroll_join_company(p_code text, p_mode text)
returns public.payroll_members language plpgsql security definer set search_path = public as $$
declare
  v_member public.payroll_members;
  v_company public.payroll_companies;
  v_employee uuid;
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
    update payroll_members
       set role = 'admin', company_id = v_company.id, employee_id = null
     where id = v_member.id
     returning * into v_member;
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

grant execute on function public.payroll_register_profile(text) to authenticated;
grant execute on function public.payroll_join_company(text, text) to authenticated;

-- RLS y políticas por empresa
alter table public.payroll_companies enable row level security;
alter table public.payroll_employees enable row level security;
alter table public.payroll_members enable row level security;
alter table public.payroll_payrolls enable row level security;
alter table public.payroll_absences enable row level security;
alter table public.payroll_documents enable row level security;

create policy payroll_companies_select on public.payroll_companies for select to authenticated
  using (payroll_is_owner() or id = payroll_my_company());
create policy payroll_companies_insert on public.payroll_companies for insert to authenticated
  with check (payroll_is_owner());
create policy payroll_companies_update on public.payroll_companies for update to authenticated
  using (payroll_can_manage(id)) with check (payroll_can_manage(id));

create policy payroll_members_select on public.payroll_members for select to authenticated
  using (
    user_id = auth.uid()
    or payroll_is_owner()
    or (payroll_my_role() = 'admin' and company_id = payroll_my_company())
  );

create policy payroll_employees_select on public.payroll_employees for select to authenticated
  using (
    payroll_can_manage(company_id)
    or (payroll_my_role() = 'employee' and id = payroll_my_employee())
  );
create policy payroll_employees_insert on public.payroll_employees for insert to authenticated
  with check (payroll_can_manage(company_id));
create policy payroll_employees_update on public.payroll_employees for update to authenticated
  using (payroll_can_manage(company_id)) with check (payroll_can_manage(company_id));

create policy payroll_payrolls_select on public.payroll_payrolls for select to authenticated
  using (
    payroll_can_manage(company_id)
    or (payroll_my_role() = 'employee' and employee_id = payroll_my_employee() and status = 'pagado')
  );
create policy payroll_payrolls_insert on public.payroll_payrolls for insert to authenticated
  with check (payroll_can_manage(company_id));
create policy payroll_payrolls_update on public.payroll_payrolls for update to authenticated
  using (payroll_can_manage(company_id)) with check (payroll_can_manage(company_id));

create policy payroll_absences_select on public.payroll_absences for select to authenticated
  using (
    payroll_can_manage(company_id)
    or (payroll_my_role() = 'employee' and employee_id = payroll_my_employee())
  );
create policy payroll_absences_insert on public.payroll_absences for insert to authenticated
  with check (
    payroll_can_manage(company_id)
    or (
      payroll_my_role() = 'employee'
      and employee_id = payroll_my_employee()
      and company_id = payroll_my_company()
      and status = 'pendiente'
    )
  );
create policy payroll_absences_update on public.payroll_absences for update to authenticated
  using (payroll_can_manage(company_id)) with check (payroll_can_manage(company_id));

create policy payroll_documents_select on public.payroll_documents for select to authenticated
  using (
    payroll_can_manage(company_id)
    or (payroll_my_role() = 'employee' and employee_id = payroll_my_employee())
  );
create policy payroll_documents_insert on public.payroll_documents for insert to authenticated
  with check (payroll_can_manage(company_id));
create policy payroll_documents_update on public.payroll_documents for update to authenticated
  using (payroll_can_manage(company_id)) with check (payroll_can_manage(company_id));
