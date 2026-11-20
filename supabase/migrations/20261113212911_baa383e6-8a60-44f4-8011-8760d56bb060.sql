delete from public.payroll_absences
where id = '2b3c2022-16fd-4be4-b297-5f471639c874'
  and employee_id = '5d4e5443-c646-449d-b18b-7e63d630008e'
  and type = 'no-remunerada'
  and start_date = '2026-11-03'
  and end_date = '2026-11-03';

create unique index if not exists payroll_absences_unique_idx
  on public.payroll_absences (employee_id, type, start_date, end_date);