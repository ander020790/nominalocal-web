with ranked as (
  select id,
         row_number() over (
           partition by employee_id, kind
           order by case status
                      when 'firmado' then 0
                      when 'generado' then 1
                      else 2
                    end,
                    created_at desc
         ) as position
  from public.payroll_documents
)
delete from public.payroll_documents d
using ranked r
where d.id = r.id and r.position > 1;

create unique index if not exists payroll_documents_employee_kind_key
  on public.payroll_documents (employee_id, kind);