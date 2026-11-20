-- Alinear los contratos ya generados con el tipo de contrato de la ficha del empleado
update public.payroll_documents d
   set kind = case e.contract_type
                when 'indefinido' then 'contrato-indefinido'
                when 'fijo' then 'contrato-fijo'
                when 'obra-labor' then 'contrato-obra-labor'
                when 'prestacion-servicios' then 'contrato-prestacion-servicios'
              end,
       title = case e.contract_type
                 when 'indefinido' then 'Contrato a término indefinido'
                 when 'fijo' then 'Contrato a término fijo'
                 when 'obra-labor' then 'Contrato por obra o labor'
                 when 'prestacion-servicios' then 'Contrato de prestación de servicios'
               end
  from public.payroll_employees e
 where d.employee_id = e.id
   and d.kind in (
     'contrato-indefinido',
     'contrato-fijo',
     'contrato-obra-labor',
     'contrato-prestacion-servicios'
   )
   and d.kind <> case e.contract_type
                   when 'indefinido' then 'contrato-indefinido'
                   when 'fijo' then 'contrato-fijo'
                   when 'obra-labor' then 'contrato-obra-labor'
                   when 'prestacion-servicios' then 'contrato-prestacion-servicios'
                 end;
