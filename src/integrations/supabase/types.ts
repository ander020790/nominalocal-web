
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "payroll_absences": {
                  Row: {
                    "company_id": string,"created_at": string,"days": number,"employee_id": string,"end_date": string,"id": string,"notes": string,"start_date": string,"status": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"days"?: number,"employee_id": string,"end_date": string,"id"?: string,"notes"?: string,"start_date": string,"status"?: string,"type"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"days"?: number,"employee_id"?: string,"end_date"?: string,"id"?: string,"notes"?: string,"start_date"?: string,"status"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_absences_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_absences_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_accrual_payments": {
                  Row: {
                    "amount": number,"company_id": string,"concept": string,"created_at": string,"created_by": string,"days": number,"employee_id": string,"id": string,"notes": string,"paid_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"company_id": string,"concept": string,"created_at"?: string,"created_by"?: string,"days"?: number,"employee_id": string,"id"?: string,"notes"?: string,"paid_at"?: string
                  }
                  Update: {
                    "amount"?: number,"company_id"?: string,"concept"?: string,"created_at"?: string,"created_by"?: string,"days"?: number,"employee_id"?: string,"id"?: string,"notes"?: string,"paid_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_accrual_payments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_accrual_payments_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_companies": {
                  Row: {
                    "access_code": string,"address": string,"city": string,"clauses": string,"concepts": NonNullable<Json>,"created_at": string,"created_by": string,"department": string,"economic_activity": string,"email": string,"id": string,"legal_rep": string,"legal_rep_doc": string,"letterhead_code": string,"letterhead_validity": string,"letterhead_version": string,"logo_data": string,"name": string,"nit": string,"params": NonNullable<Json>,"payroll_account_number": string,"payroll_account_type": string,"payroll_bank": string,"phone": string,"points_of_sale": NonNullable<Json>,"signature_data": string,"status": string,"tax_responsibilities": string,"template_clauses": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "access_code"?: string,"address"?: string,"city"?: string,"clauses"?: string,"concepts"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string,"department"?: string,"economic_activity"?: string,"email"?: string,"id"?: string,"legal_rep"?: string,"legal_rep_doc"?: string,"letterhead_code"?: string,"letterhead_validity"?: string,"letterhead_version"?: string,"logo_data"?: string,"name": string,"nit": string,"params": NonNullable<Json>,"payroll_account_number"?: string,"payroll_account_type"?: string,"payroll_bank"?: string,"phone"?: string,"points_of_sale"?: NonNullable<Json>,"signature_data"?: string,"status"?: string,"tax_responsibilities"?: string,"template_clauses"?: NonNullable<Json>
                  }
                  Update: {
                    "access_code"?: string,"address"?: string,"city"?: string,"clauses"?: string,"concepts"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string,"department"?: string,"economic_activity"?: string,"email"?: string,"id"?: string,"legal_rep"?: string,"legal_rep_doc"?: string,"letterhead_code"?: string,"letterhead_validity"?: string,"letterhead_version"?: string,"logo_data"?: string,"name"?: string,"nit"?: string,"params"?: NonNullable<Json>,"payroll_account_number"?: string,"payroll_account_type"?: string,"payroll_bank"?: string,"phone"?: string,"points_of_sale"?: NonNullable<Json>,"signature_data"?: string,"status"?: string,"tax_responsibilities"?: string,"template_clauses"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"payroll_document_sequences": {
                  Row: {
                    "company_id": string,"kind": string,"last_number": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"kind": string,"last_number"?: number,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"kind"?: string,"last_number"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_document_sequences_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_documents": {
                  Row: {
                    "company_id": string,"created_at": string,"employee_id": string,"extra_clause": string,"id": string,"kind": string,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"employee_id": string,"extra_clause"?: string,"id"?: string,"kind": string,"status"?: string,"title": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"employee_id"?: string,"extra_clause"?: string,"id"?: string,"kind"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_documents_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_employees": {
                  Row: {
                    "account_number": string,"account_type": string,"address": string,"arl_provider": string,"bank": string,"birth_date": string | null,"city": string,"company_id": string,"compensation_fund": string,"contract_type": string,"created_at": string,"department": string,"doc_number": string,"doc_type": string,"email": string,"end_date": string | null,"eps": string,"first_name": string,"fixed_deductions": NonNullable<Json>,"fixed_earnings": NonNullable<Json>,"has_moto_allowance": boolean,"id": string,"integral_salary": boolean,"last_name": string,"pension_fund": string,"phone": string,"point_of_sale_id": string | null,"position": string,"risk_level": string,"salary": number,"start_date": string,"status": string,"termination_reason": string,"transport_allowance": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "account_number"?: string,"account_type"?: string,"address"?: string,"arl_provider"?: string,"bank"?: string,"birth_date"?: string | null,"city"?: string,"company_id": string,"compensation_fund"?: string,"contract_type"?: string,"created_at"?: string,"department"?: string,"doc_number"?: string,"doc_type"?: string,"email"?: string,"end_date"?: string | null,"eps"?: string,"first_name": string,"fixed_deductions"?: NonNullable<Json>,"fixed_earnings"?: NonNullable<Json>,"has_moto_allowance"?: boolean,"id"?: string,"integral_salary"?: boolean,"last_name": string,"pension_fund"?: string,"phone"?: string,"point_of_sale_id"?: string | null,"position"?: string,"risk_level"?: string,"salary"?: number,"start_date"?: string,"status"?: string,"termination_reason"?: string,"transport_allowance"?: boolean
                  }
                  Update: {
                    "account_number"?: string,"account_type"?: string,"address"?: string,"arl_provider"?: string,"bank"?: string,"birth_date"?: string | null,"city"?: string,"company_id"?: string,"compensation_fund"?: string,"contract_type"?: string,"created_at"?: string,"department"?: string,"doc_number"?: string,"doc_type"?: string,"email"?: string,"end_date"?: string | null,"eps"?: string,"first_name"?: string,"fixed_deductions"?: NonNullable<Json>,"fixed_earnings"?: NonNullable<Json>,"has_moto_allowance"?: boolean,"id"?: string,"integral_salary"?: boolean,"last_name"?: string,"pension_fund"?: string,"phone"?: string,"point_of_sale_id"?: string | null,"position"?: string,"risk_level"?: string,"salary"?: number,"start_date"?: string,"status"?: string,"termination_reason"?: string,"transport_allowance"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_employees_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_invites": {
                  Row: {
                    "accepted_at": string | null,"company_id": string,"created_at": string,"email": string,"employee_id": string | null,"id": string,"invited_by": string,"name": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"company_id": string,"created_at"?: string,"email": string,"employee_id"?: string | null,"id"?: string,"invited_by"?: string,"name"?: string,"role": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"company_id"?: string,"created_at"?: string,"email"?: string,"employee_id"?: string | null,"id"?: string,"invited_by"?: string,"name"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_invites_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_invites_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_loans": {
                  Row: {
                    "amount": number,"company_id": string,"employee_id": string,"id": string,"installments": number,"note": string,"reason": string,"requested_at": string,"requested_by": string,"reviewed_at": string | null,"reviewed_by": string | null,"start_period": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"company_id": string,"employee_id": string,"id"?: string,"installments"?: number,"note"?: string,"reason"?: string,"requested_at"?: string,"requested_by"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"start_period"?: string,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"company_id"?: string,"employee_id"?: string,"id"?: string,"installments"?: number,"note"?: string,"reason"?: string,"requested_at"?: string,"requested_by"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"start_period"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_loans_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_loans_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_members": {
                  Row: {
                    "company_id": string | null,"created_at": string,"email": string,"employee_id": string | null,"id": string,"name": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"email": string,"employee_id"?: string | null,"id"?: string,"name"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"email"?: string,"employee_id"?: string | null,"id"?: string,"name"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_members_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_payrolls": {
                  Row: {
                    "company_id": string,"created_at": string,"days_worked": number | null,"employee_id": string,"fortnight": number,"ibc": number,"id": string,"lines": NonNullable<Json>,"novelties": NonNullable<Json>,"payment_date": string | null,"period": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"days_worked"?: number | null,"employee_id": string,"fortnight"?: number,"ibc"?: number,"id"?: string,"lines"?: NonNullable<Json>,"novelties"?: NonNullable<Json>,"payment_date"?: string | null,"period": string,"status"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"days_worked"?: number | null,"employee_id"?: string,"fortnight"?: number,"ibc"?: number,"id"?: string,"lines"?: NonNullable<Json>,"novelties"?: NonNullable<Json>,"payment_date"?: string | null,"period"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_payrolls_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_payrolls_employee_company_fkey"
      columns: ["employee_id","company_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id","company_id"]
    },{
      foreignKeyName: "payroll_payrolls_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_period_closures": {
                  Row: {
                    "closed_at": string,"closed_by": string,"company_id": string,"id": string,"period": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string,"closed_by"?: string,"company_id": string,"id"?: string,"period": string
                  }
                  Update: {
                    "closed_at"?: string,"closed_by"?: string,"company_id"?: string,"id"?: string,"period"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_period_closures_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_settlements": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string,"cutoff": string,"days_semester": number,"days_year": number,"employee_id": string,"extra_earnings": NonNullable<Json>,"gross": number,"id": string,"legal_deductions": number,"lines": NonNullable<Json>,"net": number,"notes": string,"other_deductions": number,"other_earnings": number,"pending_salary_days": number,"prior_payments": NonNullable<Json>,"total_deductions": number,"updated_at": string,"vacation_days": number
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string,"cutoff"?: string,"days_semester"?: number,"days_year"?: number,"employee_id": string,"extra_earnings"?: NonNullable<Json>,"gross"?: number,"id"?: string,"legal_deductions"?: number,"lines"?: NonNullable<Json>,"net"?: number,"notes"?: string,"other_deductions"?: number,"other_earnings"?: number,"pending_salary_days"?: number,"prior_payments"?: NonNullable<Json>,"total_deductions"?: number,"updated_at"?: string,"vacation_days"?: number
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string,"cutoff"?: string,"days_semester"?: number,"days_year"?: number,"employee_id"?: string,"extra_earnings"?: NonNullable<Json>,"gross"?: number,"id"?: string,"legal_deductions"?: number,"lines"?: NonNullable<Json>,"net"?: number,"notes"?: string,"other_deductions"?: number,"other_earnings"?: number,"pending_salary_days"?: number,"prior_payments"?: NonNullable<Json>,"total_deductions"?: number,"updated_at"?: string,"vacation_days"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_settlements_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_settlements_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_signatures": {
                  Row: {
                    "company_id": string,"data": string,"employee_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"data"?: string,"employee_id": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"data"?: string,"employee_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_signatures_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_signatures_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: true
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_suspensions": {
                  Row: {
                    "company_id": string,"created_at": string,"days": number,"employee_id": string,"end_date": string,"id": string,"notes": string,"reason": string,"start_date": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"days"?: number,"employee_id": string,"end_date": string,"id"?: string,"notes"?: string,"reason"?: string,"start_date": string,"status"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"days"?: number,"employee_id"?: string,"end_date"?: string,"id"?: string,"notes"?: string,"reason"?: string,"start_date"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_suspensions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_suspensions_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                },"payroll_warnings": {
                  Row: {
                    "company_id": string,"created_at": string,"description": string,"employee_id": string,"id": string,"reason": string,"severity": string,"warning_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"description"?: string,"employee_id": string,"id"?: string,"reason"?: string,"severity"?: string,"warning_date"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"description"?: string,"employee_id"?: string,"id"?: string,"reason"?: string,"severity"?: string,"warning_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payroll_warnings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "payroll_companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payroll_warnings_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "payroll_employees"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "payroll_accept_invite":
{ Args: Record<PropertyKey, never>; Returns: {
              "company_id": string | null,
"created_at": string,
"email": string,
"employee_id": string | null,
"id": string,
"name": string,
"role": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "payroll_members"
        isOneToOne: true
        isSetofReturn: false
      } },
"payroll_can_manage":
{ Args: { "target_company": string }; Returns: boolean
                           },
"payroll_contract_kind":
{ Args: { "p_type": string }; Returns: string
                           },
"payroll_is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"payroll_join_company":
{ Args: { "p_code": string,"p_mode": string }; Returns: {
              "company_id": string | null,
"created_at": string,
"email": string,
"employee_id": string | null,
"id": string,
"name": string,
"role": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "payroll_members"
        isOneToOne: true
        isSetofReturn: false
      } },
"payroll_my_company":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"payroll_my_employee":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"payroll_my_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"payroll_next_document_number":
{ Args: { "p_company_id": string,"p_kind": string }; Returns: number
                           },
"payroll_register_profile":
{ Args: { "p_name"?: string }; Returns: {
              "company_id": string | null,
"created_at": string,
"email": string,
"employee_id": string | null,
"id": string,
"name": string,
"role": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "payroll_members"
        isOneToOne: true
        isSetofReturn: false
      } },
"payroll_save_batch":
{ Args: { "p_company_id": string,"p_fortnight": number,"p_period": string,"p_rows": Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
