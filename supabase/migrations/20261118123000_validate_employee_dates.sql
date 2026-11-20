-- Impedir fechas de retiro anteriores a la fecha de ingreso.
ALTER TABLE public.payroll_employees
ADD CONSTRAINT payroll_employees_valid_dates
CHECK (
  end_date IS NULL
  OR end_date >= start_date
);
