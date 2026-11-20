delete from public.payroll_absences
where type = 'permiso'
  and id in (
    '92f13ee3-73a6-4b85-b3fb-9c99e498c60d',
    'cd13409e-b022-41f3-8c7b-ac1f18ac4fb6'
  );