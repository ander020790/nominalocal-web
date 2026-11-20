alter table public.payroll_absences
  drop constraint if exists payroll_absences_type_check;

alter table public.payroll_absences
  add constraint payroll_absences_type_check
  check (type in ('vacaciones', 'incapacidad', 'permiso', 'licencia', 'no-remunerada'));