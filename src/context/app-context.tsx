// @refresh reset
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { BASE_PARAMS, DEFAULT_CONCEPTS } from "@/data/defaults";
import type {
  Absence,
  AbsenceType,
  AccrualConcept,
  AccrualPayment,
  Company,
  CompanyInvite,
  CompanyUser,
  DocumentKind,
  DocumentStatus,
  Employee,
  GeneratedDocumentRecord,
  Payroll,
  PayrollLine,
  PayrollPeriodClosure,
  PayrollStatus,
  Role,
  SalaryConcept,
  Session,
  SettlementRecord,
  SettlementSaveInput,
} from "@/data/types";
import {
  calculateNovelties,
  calculatePayroll,
  type PayrollNovelties,
} from "@/lib/payroll";
import {
  documentKindForContract,
  hasGeneratedContract,
} from "@/lib/documents";
import {
  fortnightCalendarRange,
  defaultPaymentDate,
  employeeInFortnight,
  incapacityDaysInFortnight,
  suspensionDaysInFortnight,
  unpaidDaysInFortnight,
  vacationDaysInFortnight,
  workedDaysInFortnight,
} from "@/lib/payroll-periods";
import {
  AppContext,
  type AppContextValue,
  type NewCompanyInput,
  type NewEmployeeInput,
} from "@/context/app-context-value";
import {
  companyPatch,
  employeePatch,
  employeeToInsert,
  mapAbsence,
  mapAccrualPayment,
  mapCompany,
  mapDocument,
  mapEmployee,
  mapInvite,
  mapMember,
  mapSettlement,
  mapPayroll,
  type MemberRow,
} from "@/lib/db-mappers";

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [documents, setDocuments] = useState<GeneratedDocumentRecord[]>([]);
  const [accrualPayments, setAccrualPayments] = useState<AccrualPayment[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [suspensions, setSuspensions] = useState<
    { employeeId: string; startDate: string; endDate: string; status: string }[]
  >([]);
  const [employeeSignatures, setEmployeeSignatures] = useState<
    Record<string, string>
  >({});
  const [members, setMembers] = useState<CompanyUser[]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [periodClosures, setPeriodClosures] = useState<PayrollPeriodClosure[]>(
    [],
  );
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const sessionRef = useRef<Session | null>(null);
  const loadingUserRef = useRef<string | null>(null);
  const lastUserLoadRef = useRef<{ id: string; at: number } | null>(null);

  const loadData = useCallback(async (current: Session) => {
    setDataLoading(true);
    try {
      const isOwner = current.role === "owner";
      let memberQuery = supabase
        .from("payroll_members")
        .select("*")
        .in("role", ["admin", "employee"]);
      if (!isOwner && current.companyId) {
        memberQuery = memberQuery.eq("company_id", current.companyId);
      }
      const [
        companyResult,
        employeeResult,
        payrollResult,
        absenceResult,
        documentResult,
        memberResult,
        inviteResult,
        closureResult,
        accrualResult,
        signatureResult,
        suspensionResult,
        settlementResult,
      ] = await Promise.all([
        supabase
          .from("payroll_companies")
          .select("*")
          .order("created_at", { ascending: true }),
        supabase
          .from("payroll_employees")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("payroll_payrolls")
          .select("*")
          .order("period", { ascending: false }),
        supabase
          .from("payroll_absences")
          .select("*")
          .order("start_date", { ascending: false }),
        supabase
          .from("payroll_documents")
          .select("*")
          .order("created_at", { ascending: false }),
        memberQuery.order("created_at", { ascending: true }),
        supabase
          .from("payroll_invites")
          .select("*")
          .is("accepted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("payroll_period_closures").select("*"),
        supabase
          .from("payroll_accrual_payments")
          .select("*")
          .order("paid_at", { ascending: false }),
        supabase.from("payroll_signatures").select("employee_id, data"),
        supabase
          .from("payroll_suspensions")
          .select("employee_id, start_date, end_date, status"),
        supabase
          .from("payroll_settlements")
          .select("*")
          .order("cutoff", { ascending: false }),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (employeeResult.error) throw employeeResult.error;
      if (payrollResult.error) throw payrollResult.error;
      if (absenceResult.error) throw absenceResult.error;
      if (documentResult.error) throw documentResult.error;
      if (memberResult.error) throw memberResult.error;
      if (inviteResult.error) throw inviteResult.error;
      if (closureResult.error) throw closureResult.error;
      if (accrualResult.error) throw accrualResult.error;
      if (signatureResult.error) throw signatureResult.error;
      if (settlementResult.error) throw settlementResult.error;

      setCompanies((companyResult.data ?? []).map(mapCompany));
      setEmployees((employeeResult.data ?? []).map(mapEmployee));
      setPayrolls((payrollResult.data ?? []).map(mapPayroll));
      setAbsences((absenceResult.data ?? []).map(mapAbsence));
      setDocuments((documentResult.data ?? []).map(mapDocument));
      setAccrualPayments((accrualResult.data ?? []).map(mapAccrualPayment));
      setSuspensions(
        (suspensionResult.data ?? []).map((row) => ({
          employeeId: row.employee_id,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
        })),
      );
      setSuspensions(
        (suspensionResult.data ?? []).map((row) => ({
          employeeId: row.employee_id,
          startDate: row.start_date,
          endDate: row.end_date,
          status: row.status,
        })),
      );
      setEmployeeSignatures(
        Object.fromEntries(
          (signatureResult.data ?? [])
            .filter((row) => row.data)
            .map((row) => [row.employee_id, row.data as string]),
        ),
      );
      setSettlements((settlementResult.data ?? []).map(mapSettlement));
      setMembers((memberResult.data ?? []).map(mapMember));
      setInvites(isOwner ? (inviteResult.data ?? []).map(mapInvite) : []);
      setPeriodClosures(
        (closureResult.data ?? []).map((row) => ({
          companyId: row.company_id,
          period: row.period,
          closedAt: row.closed_at,
        })),
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos cargar la información de la empresa.",
      );
    } finally {
      setDataLoading(false);
    }
  }, []);

  const loadMember = useCallback(
    async (user: User) => {
      if (loadingUserRef.current === user.id) return;
      if (
        lastUserLoadRef.current?.id === user.id &&
        Date.now() - lastUserLoadRef.current.at < 1500
      ) {
        return;
      }
      loadingUserRef.current = user.id;
      lastUserLoadRef.current = { id: user.id, at: Date.now() };
      setAuthLoading(true);
      try {
        const { data, error } = await supabase
          .from("payroll_members")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;

        let member = data as MemberRow | null;
        if (!member) {
          const { data: created, error: registerError } = await supabase.rpc(
            "payroll_register_profile",
            { p_name: user.user_metadata?.full_name ?? "" },
          );
          if (registerError) throw registerError;
          member = (Array.isArray(created) ? created[0] : created) as
            | MemberRow
            | null;
        }
        if (!member) throw new Error("No pudimos crear tu perfil de usuario.");

        const nextSession: Session = {
          userId: user.id,
          name: member.name || user.email || "Usuario",
          email: member.email || user.email || "",
          role: member.role as Role,
          companyId: member.company_id,
          employeeId: member.employee_id,
        };
        sessionRef.current = nextSession;
        setSession(nextSession);
        if (member.role !== "owner") {
          setActiveCompanyId(member.company_id);
        }
        await loadData(nextSession);
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : "No pudimos iniciar tu sesión.",
        );
      } finally {
        setAuthLoading(false);
        loadingUserRef.current = null;
      }
    },
    [loadData],
  );

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, authSession) => {
        if (!authSession?.user) {
          sessionRef.current = null;
          setSession(null);
          setCompanies([]);
          setEmployees([]);
          setPayrolls([]);
          setAbsences([]);
          setDocuments([]);
          setAuthLoading(false);
          return;
        }
        if (
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION"
        ) {
          setTimeout(() => {
            void loadMember(authSession.user);
          }, 0);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadMember]);

  const refresh = useCallback(async () => {
    if (!sessionRef.current) return;
    await loadData(sessionRef.current);
  }, [loadData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: name },
        },
      });
      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setActiveCompanyId(null);
  }, []);

  const joinCompany = useCallback(
    async (code: string, mode: "admin" | "employee") => {
      const { error } = await supabase.rpc("payroll_join_company", {
        p_code: code.trim(),
        p_mode: mode,
      });
      if (error) throw error;
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        loadingUserRef.current = null;
        await loadMember(data.user);
      }
      toast.success(
        mode === "admin"
          ? "Tu usuario quedó vinculado como administrador de RRHH."
          : "Tu portal del empleado quedó activo.",
      );
    },
    [loadMember],
  );

  const impersonateCompany = useCallback((companyId: string) => {
    setActiveCompanyId(companyId);
    toast.info("Entraste a la empresa en modo supervisión.");
  }, []);

  const returnToOwner = useCallback(() => {
    setActiveCompanyId(null);
  }, []);

  const viewRole: Role = useMemo(() => {
    if (!session) return "pending";
    if (session.role === "owner") {
      return companies.some((company) => company.id === activeCompanyId)
        ? "admin"
        : "owner";
    }
    return session.role;
  }, [session, companies, activeCompanyId]);

  const currentCompany = useMemo(() => {
    if (!session) return null;
    if (session.role === "owner") {
      return companies.find((company) => company.id === activeCompanyId) ?? null;
    }
    return companies.find((company) => company.id === session.companyId) ?? null;
  }, [companies, session, activeCompanyId]);

  const visibleCompanies = useMemo(() => {
    if (!session) return [];
    if (session.role === "owner") return companies;
    return companies.filter((company) => company.id === session.companyId);
  }, [companies, session]);

  const companyEmployees = useMemo(() => {
    if (!currentCompany) return employees;
    return employees.filter(
      (employee) => employee.companyId === currentCompany.id,
    );
  }, [employees, currentCompany]);

  const companyPayrolls = useMemo(() => {
    if (!currentCompany) return payrolls;
    return payrolls.filter(
      (payroll) => payroll.companyId === currentCompany.id,
    );
  }, [payrolls, currentCompany]);

  const companyAbsences = useMemo(() => {
    if (!currentCompany) return absences;
    return absences.filter((absence) => absence.companyId === currentCompany.id);
  }, [absences, currentCompany]);

  const companyDocuments = useMemo(() => {
    if (!currentCompany) return documents;
    return documents.filter(
      (document) => document.companyId === currentCompany.id,
    );
  }, [documents, currentCompany]);

  const companySettlements = useMemo(() => {
    if (!currentCompany) return settlements;
    return settlements.filter(
      (settlement) => settlement.companyId === currentCompany.id,
    );
  }, [settlements, currentCompany]);

  const currentEmployee = useMemo(() => {
    if (session?.employeeId) {
      return employees.find((employee) => employee.id === session.employeeId) ?? null;
    }
    return null;
  }, [employees, session]);

  const addEmployee = useCallback(
    async (input: NewEmployeeInput) => {
      if (!currentCompany) {
        toast.error("Selecciona una empresa antes de agregar empleados.");
        return null;
      }
      const { data, error } = await supabase
        .from("payroll_employees")
        .insert(
          employeeToInsert(currentCompany.id, {
            ...input,
            endDate: null,
            fixedEarnings: input.fixedEarnings ?? [],
            fixedDeductions: input.fixedDeductions ?? [],
          }),
        )
        .select("*")
        .single();
      if (error || !data) {
        toast.error(
          error.code === "23505"
            ? "Ya existe un empleado activo con ese documento en la empresa."
            : error.message,
        );
        return null;
      }
      await refresh();
      toast.success(
        `${input.firstName} ${input.lastName} se agregó a la plantilla.`,
      );
      return mapEmployee(data);
    },
    [currentCompany, refresh],
  );

  const updateEmployee = useCallback(
    async (id: string, input: Partial<Employee>) => {
      const { error } = await supabase
        .from("payroll_employees")
        .update(employeePatch(input))
        .eq("id", id);
      if (error) {
        toast.error(
          error.code === "23505"
            ? "Ya existe otro empleado activo con ese documento."
            : error.message,
        );
        return false;
      }
      await refresh();
      toast.success("Ficha del empleado actualizada.");
      return true;
    },
    [refresh],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      const { count, error: checkError } = await supabase
        .from("payroll_payrolls")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", id);

      if (checkError) {
        toast.error(checkError.message);
        return;
      }

      if (count === null) {
        toast.error("No se pudo verificar el historial del empleado.");
        return;
      }

      if (count > 0) {
        toast.error(
          "Este empleado tiene nóminas registradas. Utiliza la opción de retiro para conservar su historial.",
        );
        return;
      }

      const { data, error } = await supabase
        .from("payroll_employees")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) {
        toast.error(
          error.code === "23503"
            ? "No se puede eliminar porque tiene registros asociados."
            : error.message,
        );
        return;
      }

      if (!data?.length) {
        toast.error(
          "No se eliminó el empleado. Verifica sus permisos y actualiza la información.",
        );
        await refresh();
        return;
      }

      await refresh();
      toast.success("Empleado eliminado.");
    },
    [refresh],
  );

  const reactivateEmployee = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("payroll_employees")
        .update({
          status: "activo",
          end_date: null,
          termination_reason: "",
        })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return false;
      }
      await refresh();
      toast.success("Retiro eliminado. La ficha quedó activa de nuevo.");
      return true;
    },
    [refresh],
  );

  const retireEmployee = useCallback(
    async (
      id: string,
      options: { endDate?: string; reason?: string } = {},
    ) => {
      const employee = employees.find((item) => item.id === id);
      const today = new Date().toISOString().slice(0, 10);
      const endDate =
        options.endDate ??
        (employee?.endDate && employee.endDate <= today
          ? employee.endDate
          : today);
      const { error } = await supabase
        .from("payroll_employees")
        .update({
          status: "retirado",
          end_date: endDate,
          termination_reason: options.reason ?? "renuncia",
        })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success(
        employee?.contractType === "prestacion-servicios"
          ? "Empleado retirado. La prestación de servicios no genera liquidación laboral."
          : "Empleado retirado. Revisa su liquidación final en Liquidaciones.",
      );
    },
    [employees, refresh],
  );

  const addCompany = useCallback(
    async (input: NewCompanyInput) => {
      const { error } = await supabase.from("payroll_companies").insert({
        name: input.name,
        nit: input.nit,
        city: input.city,
        department: input.department ?? "",
        address: input.address,
        phone: input.phone,
        email: input.email,
        legal_rep: input.legalRep,
        legal_rep_doc: input.legalRepDoc,
        economic_activity: input.economicActivity ?? "",
        tax_responsibilities: input.taxResponsibilities ?? "",
        status: "activa",
        params: BASE_PARAMS as unknown as Json,
        concepts: DEFAULT_CONCEPTS as unknown as Json,
        points_of_sale:
          input.pointsOfSale && input.pointsOfSale.length > 0
            ? input.pointsOfSale.map((point) => ({
                id: uid("ps"),
                name: point.name,
                city: point.city || input.city,
                address: point.address,
                manager: "",
                phone: point.phone,
              }))
            : [
                {
                  id: uid("ps"),
                  name: "Punto principal",
                  city: input.city,
                  address: input.address,
                  manager: input.adminName,
                },
              ],
        clauses: "",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success(
        `${input.name} quedó creada. Asígnale su administrador en Usuarios y accesos.`,
      );
    },
    [refresh],
  );

  const updateCompany = useCallback(
    async (id: string, input: Partial<Company>) => {
      const { error } = await supabase
        .from("payroll_companies")
        .update(companyPatch(input))
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Configuración de la empresa guardada.");
    },
    [refresh],
  );

  const toggleCompanyStatus = useCallback(
    async (id: string) => {
      const company = companies.find((item) => item.id === id);
      if (!company) return;
      await updateCompany(id, {
        status: company.status === "activa" ? "inactiva" : "activa",
      });
    },
    [companies, updateCompany],
  );

  const addConcept = useCallback(
    async (concept: SalaryConcept) => {
      if (!currentCompany) return;
      await updateCompany(currentCompany.id, {
        concepts: [...currentCompany.concepts, { ...concept, id: uid("con") }],
      });
      toast.success("Concepto agregado al catálogo.");
    },
    [currentCompany, updateCompany],
  );

  const removeConcept = useCallback(
    async (conceptId: string) => {
      if (!currentCompany) return;
      await updateCompany(currentCompany.id, {
        concepts: currentCompany.concepts.filter(
          (concept) => concept.id !== conceptId,
        ),
      });
      toast.success("Concepto eliminado.");
    },
    [currentCompany, updateCompany],
  );

  const applyAnnualParameters = useCallback(
    async (input: {
      year: number;
      smmlv: number;
      transportAllowance: number;
      uvt: number;
      raiseSmmlvSalaries: boolean;
    }) => {
      if (!currentCompany) return;
      const previousSmmlv = currentCompany.params.smmlv;
      const { error } = await supabase
        .from("payroll_companies")
        .update({
          params: {
            ...currentCompany.params,
            year: input.year,
            smmlv: input.smmlv,
            transportAllowance: input.transportAllowance,
            uvt: input.uvt,
          } as unknown as never,
        })
        .eq("id", currentCompany.id);
      if (error) {
        toast.error(error.message);
        return;
      }

      let raised = 0;
      if (input.raiseSmmlvSalaries && input.smmlv > previousSmmlv) {
        const targets = employees.filter(
          (employee) =>
            employee.companyId === currentCompany.id &&
            Number(employee.salary) === Number(previousSmmlv),
        );
        if (targets.length > 0) {
          const { error: salaryError } = await supabase
            .from("payroll_employees")
            .update({ salary: input.smmlv })
            .in(
              "id",
              targets.map((employee) => employee.id),
            );
          if (salaryError) {
            toast.error(salaryError.message);
          } else {
            raised = targets.length;
          }
        }
      }

      await refresh();
      toast.success(
        `Parámetros ${input.year} actualizados${raised > 0 ? ` · ${raised} salarios ajustados al nuevo SMLMV` : ""}.`,
      );
    },
    [currentCompany, employees, refresh],
  );

  const generatePayroll = useCallback(
    async (
      targetPeriod: string,
      novelties: Record<string, PayrollNovelties> = {},
      paymentDate?: string,
      targetFortnight: 1 | 2 = 1,
      onlyEmployeeId?: string,
      force = false,
      carriedExtras?: Record<string, { label: string; amount: number }[]>,
      mode: "new" | "recalculate" = "new",
    ) => {
      if (!currentCompany) return 0;
      const activeEmployees = employees.filter(
        (employee) =>
          employee.companyId === currentCompany.id &&
          (employee.status === "activo" ||
            (employee.status === "retirado" && employee.endDate)) &&
          employeeInFortnight(employee, targetPeriod, targetFortnight),
      );
      const missing = activeEmployees.filter(
        (employee) =>
          (!onlyEmployeeId || employee.id === onlyEmployeeId) &&
          (mode === "new"
            ? !payrolls.some(
                (payroll) =>
                  payroll.employeeId === employee.id &&
                  payroll.period === targetPeriod &&
                  (payroll.fortnight ?? 1) === targetFortnight,
              )
            : payrolls.some(
                (payroll) =>
                  payroll.employeeId === employee.id &&
                  payroll.period === targetPeriod &&
                  (payroll.fortnight ?? 1) === targetFortnight &&
                  payroll.status === "borrador",
              )),
      );
      if (
        periodClosures.some(
          (closure) =>
            closure.companyId === currentCompany.id &&
            closure.period === targetPeriod,
        )
      ) {
        toast.error(
          "La nómina de ese periodo está finalizada. Reábrela para generar cambios.",
        );
        return 0;
      }
      if (missing.length === 0) {
        toast.info(
          onlyEmployeeId
            ? "Ese colaborador ya tiene la nómina de la quincena."
            : `La quincena ${targetFortnight} de ese periodo ya está generada.`,
        );
        return 0;
      }
      const missingContracts = force
        ? []
        : missing.filter(
            (employee) => !hasGeneratedContract(employee, documents),
          );
      if (missingContracts.length > 0) {
        const names = missingContracts
          .slice(0, 3)
          .map((employee) => `${employee.firstName} ${employee.lastName}`)
          .join(", ");
        toast.error(
          `Genera el contrato antes de liquidar: ${names}${missingContracts.length > 3 ? ` y ${missingContracts.length - 3} más` : ""}. Ve a Documentos → Contratos.`,
        );
        return 0;
      }
      const rows = missing
        .filter(
          (employee) =>
            workedDaysInFortnight(employee, targetPeriod, targetFortnight) -
              suspensionDaysInFortnight(
                employee.id,
                suspensions,
                targetPeriod,
                targetFortnight,
              ) -
              incapacityDaysInFortnight(
                employee.id,
                absences,
                targetPeriod,
                targetFortnight,
              ) -
              unpaidDaysInFortnight(
                employee.id,
                absences,
                targetPeriod,
                targetFortnight,
              ) -
              vacationDaysInFortnight(
                employee.id,
                absences,
                targetPeriod,
                targetFortnight,
              ) >
            0,
        )
        .map((employee) => {
        const incapacityDays = incapacityDaysInFortnight(
          employee.id,
          absences,
          targetPeriod,
          targetFortnight,
        );
        const novelty = novelties[employee.id];
        const extras = novelty
          ? calculateNovelties(employee, currentCompany, novelty).extras
          : [];
        (carriedExtras?.[employee.id] ?? []).forEach((extra) => {
          extras.push({ label: extra.label, amount: extra.amount });
        });
        if (incapacityDays > 0) {
          // Incapacidad por enfermedad general: 66,67% del salario (art. 227 CST).
          const foodAllowance =
            extras.find((extra) =>
              extra.label.toLowerCase().includes("alimentaci"),
            )?.amount ?? 0;
          extras.push({
            label: "Incapacidad (100%)",
            amount: Math.round(
              ((employee.salary + foodAllowance) / 30) * incapacityDays,
            ),
            detail: `${incapacityDays} días · base salario + auxilio de alimentación · 100%`,
            cotizable: false,
            taxable: false,
            prestacional: false,
          });
        }
        const unpaidDays = unpaidDaysInFortnight(
          employee.id,
          absences,
          targetPeriod,
          targetFortnight,
        );
        const vacationDays = vacationDaysInFortnight(
          employee.id,
          absences,
          targetPeriod,
          targetFortnight,
        );
        const workedDays = Math.max(
          0,
          workedDaysInFortnight(employee, targetPeriod, targetFortnight) -
            suspensionDaysInFortnight(
              employee.id,
              suspensions,
              targetPeriod,
              targetFortnight,
            ) -
            incapacityDays -
            unpaidDays -
            vacationDays,
        );
        // El auxilio de alimentación se prorratea por los días efectivamente
        // trabajados (descuenta suspensiones, incapacidades, no remuneradas y
        // vacaciones).
        const fullDays = workedDaysInFortnight(
          employee,
          targetPeriod,
          targetFortnight,
        );
        const prorate = fullDays > 0 ? workedDays / fullDays : 0;
        const adjustedExtras = extras.map((extra) =>
          extra.label.toLowerCase().includes("alimentaci")
            ? {
                ...extra,
                amount: Math.round(extra.amount * prorate),
                detail: extra.detail
                  ? `${extra.detail} · ${workedDays} de ${fullDays} días`
                  : `${workedDays} de ${fullDays} días`,
              }
            : extra,
        );
        const result = calculatePayroll(
          employee,
          currentCompany,
          adjustedExtras,
          workedDays,
          targetFortnight,
        );
        if (vacationDays > 0) {
          const salaryLine = result.lines.find(
            (line) =>
              line.label === "Salario base" ||
              line.label === "Salario integral",
          );
          if (salaryLine) {
            salaryLine.detail = `${workedDays} días laborados · ${vacationDays} días de vacaciones se pagan en la liquidación de vacaciones`;
          }
        }
        return {
          company_id: currentCompany.id,
          employee_id: employee.id,
          period: targetPeriod,
          status: "borrador" as const,
          lines: result.lines as unknown as Record<string, unknown>[],
          ibc: result.ibc,
          payment_date:
            paymentDate ?? defaultPaymentDate(targetPeriod, targetFortnight),
          fortnight: targetFortnight,
          days_worked: workedDays,
          novelties: {
            ...(novelties[employee.id] ?? {}),
            suspensionDays: suspensionDaysInFortnight(
              employee.id,
              suspensions,
              targetPeriod,
              targetFortnight,
            ),
            unpaidDays,
            incapacityDays,
            vacationDays,
            suspensionRange: (() => {
              const { start, end } = fortnightCalendarRange(
                targetPeriod,
                targetFortnight,
              );
              return suspensions
                .filter(
                  (item) =>
                    item.employeeId === employee.id &&
                    item.status !== "cancelada" &&
                    item.startDate <= end &&
                    item.endDate >= start,
                )
                .map(
                  (item) =>
                    `${item.startDate.slice(8, 10)}/${item.startDate.slice(5, 7)} al ${item.endDate.slice(8, 10)}/${item.endDate.slice(5, 7)}`,
                )
                .join(", ");
            })(),
            unpaidRange: (() => {
              const { start, end } = fortnightCalendarRange(
                targetPeriod,
                targetFortnight,
              );
              return absences
                .filter(
                  (item) =>
                    item.employeeId === employee.id &&
                    item.type === "no-remunerada" &&
                    item.status === "aprobada" &&
                    item.startDate <= end &&
                    item.endDate >= start,
                )
                .map(
                  (item) =>
                    `${item.startDate.slice(8, 10)}/${item.startDate.slice(5, 7)} al ${item.endDate.slice(8, 10)}/${item.endDate.slice(5, 7)}`,
                )
                .join(", ");
            })(),
            incapacityRange: (() => {
              const { start, end } = fortnightCalendarRange(
                targetPeriod,
                targetFortnight,
              );
              return absences
                .filter(
                  (item) =>
                    item.employeeId === employee.id &&
                    item.type === "incapacidad" &&
                    item.status === "aprobada" &&
                    item.startDate <= end &&
                    item.endDate >= start,
                )
                .map(
                  (item) =>
                    `${item.startDate.slice(8, 10)}/${item.startDate.slice(5, 7)} al ${item.endDate.slice(8, 10)}/${item.endDate.slice(5, 7)}`,
                )
                .join(", ");
            })(),
            vacationRange: (() => {
              const { start, end } = fortnightCalendarRange(
                targetPeriod,
                targetFortnight,
              );
              return absences
                .filter(
                  (item) =>
                    item.employeeId === employee.id &&
                    item.type === "vacaciones" &&
                    item.status === "aprobada" &&
                    item.startDate <= end &&
                    item.endDate >= start,
                )
                .map(
                  (item) =>
                    `${item.startDate.slice(8, 10)}/${item.startDate.slice(5, 7)} al ${item.endDate.slice(8, 10)}/${item.endDate.slice(5, 7)}`,
                )
                .join(", ");
            })(),
          } as never,
        };
      });
      const { data, error } = await supabase.rpc("payroll_save_batch", {
        p_company_id: currentCompany.id,
        p_period: targetPeriod,
        p_fortnight: targetFortnight,
        p_rows: rows as unknown as Json,
      });

      if (error) {
        toast.error(
          /duplicate key|unique constraint/i.test(error.message)
            ? "Ya existe una nómina para uno de los colaboradores."
            : error.message,
        );
        await refresh();
        return 0;
      }

      const result = data as {
        created?: number;
        recalculated?: number;
      } | null;

      const created = result?.created ?? 0;
      const recalculated = result?.recalculated ?? 0;

      await refresh();

      toast.success(
        `${created} nóminas nuevas y ${recalculated} borradores recalculados · ${targetPeriod} quincena ${targetFortnight}.`,
      );

      return created + recalculated;
    },
    [
      currentCompany,
      employees,
      payrolls,
      periodClosures,
      documents,
      suspensions,
      absences,
      refresh,
    ],
  );

  const saveEmployeeSignature = useCallback(
    async (employeeId: string, data: string) => {
      const employee = employees.find((item) => item.id === employeeId);
      const companyId = employee?.companyId ?? currentCompany?.id;
      if (!companyId) return;
      const { error } = await supabase.from("payroll_signatures").upsert(
        {
          employee_id: employeeId,
          company_id: companyId,
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id" },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      setEmployeeSignatures((current) => ({ ...current, [employeeId]: data }));
      toast.success("Firma guardada.");
    },
    [employees, currentCompany],
  );

  const deletePayroll = useCallback(
    async (payrollId: string) => {
      const { error } = await supabase
        .from("payroll_payrolls")
        .delete()
        .eq("id", payrollId);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Nómina eliminada. Puedes generarla de nuevo.");
    },
    [refresh],
  );

  const payPayrollFortnight = useCallback(
    async (targetPeriod: string, targetFortnight: 1 | 2, ids?: string[]): Promise<boolean> => {
      if (!currentCompany) {
        toast.error("Selecciona una empresa antes de pagar.");
        return false;
      }

      if (ids && ids.length === 0) {
        toast.error("No hay nóminas seleccionadas para pagar.");
        return false;
      }

      if (ids && new Set(ids).size !== ids.length) {
        toast.error("La selección contiene nóminas duplicadas.");
        return false;
      }

      let selection = supabase
        .from("payroll_payrolls")
        .select("id, status")
        .eq("company_id", currentCompany.id)
        .eq("period", targetPeriod)
        .eq("fortnight", targetFortnight);

      if (ids) {
        selection = selection.in("id", ids);
      }

      const { data: records, error: selectionError } = await selection;

      if (selectionError) {
        toast.error(selectionError.message);
        return false;
      }

      if (!records?.length || (ids && records.length !== ids.length)) {
        toast.error("No se encontraron todas las nóminas seleccionadas.");
        return false;
      }

      if (records.some((record) => record.status !== "revisado")) {
        toast.error("Todas las nóminas deben estar revisadas antes del pago.");
        return false;
      }

      const selectedIds = records.map((record) => record.id);

      const { data: updated, error: paymentError } = await supabase
        .from("payroll_payrolls")
        .update({ status: "pagado" })
        .eq("company_id", currentCompany.id)
        .eq("period", targetPeriod)
        .eq("fortnight", targetFortnight)
        .eq("status", "revisado")
        .in("id", selectedIds)
        .select("id");

      if (paymentError) {
        toast.error(paymentError.message);
        return false;
      }

      if (updated?.length !== selectedIds.length) {
        toast.error("El pago no se confirmó para todas las nóminas. Revisa los estados antes de continuar.");
        await refresh();
        return false;
      }

      await refresh();
      toast.success(
        "Nómina marcada como pagada. Los colaboradores ya pueden ver su comprobante.",
      );
      return true;
    },
    [currentCompany, refresh],
  );

  const deletePayrollFortnight = useCallback(
    async (targetPeriod: string, targetFortnight: 1 | 2, ids?: string[]) => {
      if (!currentCompany) return;
      let query = supabase
        .from("payroll_payrolls")
        .delete()
        .eq("company_id", currentCompany.id);
      if (ids && ids.length > 0) {
        query = query.in("id", ids);
      } else {
        query = query
          .eq("period", targetPeriod)
          .eq("fortnight", targetFortnight);
      }
      const { error } = await query;
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success(
        `Liquidación de la quincena ${targetFortnight} eliminada. Puedes generarla de nuevo.`,
      );
    },
    [currentCompany, refresh],
  );

  const updatePayrollFortnightDate = useCallback(
    async (
      targetPeriod: string,
      targetFortnight: 1 | 2,
      paymentDate: string,
      ids?: string[],
    ) => {
      if (!currentCompany) return;
      let query = supabase
        .from("payroll_payrolls")
        .update({ payment_date: paymentDate })
        .eq("company_id", currentCompany.id);
      if (ids && ids.length > 0) {
        query = query.in("id", ids);
      } else {
        query = query
          .eq("period", targetPeriod)
          .eq("fortnight", targetFortnight);
      }
      const { error } = await query;
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Fecha de liquidación actualizada.");
    },
    [currentCompany, refresh],
  );

  const persistPayrollLines = useCallback(
    async (payrollId: string, lines: PayrollLine[], status?: PayrollStatus) => {
      const current = payrolls.find((payroll) => payroll.id === payrollId);
      if (!current) return;
      if (current.status === "pagado") {
        toast.error("Una nómina pagada no puede modificarse ni reabrirse.");
        return false;
      }

      const nextStatus = status ?? current.status;

      const allowed =
        (current.status === "borrador" &&
          (nextStatus === "borrador" || nextStatus === "revisado")) ||
        (current.status === "revisado" &&
          (nextStatus === "borrador" ||
            nextStatus === "revisado" ||
            nextStatus === "pagado"));

      if (!allowed) {
        toast.error("Cambio de estado de nómina no permitido.");
        return false;
      }

      const { data, error } = await supabase
        .from("payroll_payrolls")
        .update({
          lines: lines as unknown as Json,
          status: nextStatus,
        })
        .eq("id", payrollId)
        .eq("status", current.status)
        .select("id");

      if (error || !data?.length) {
        toast.error(
          error?.message ??
            "La nómina cambió de estado. Actualiza e inténtalo nuevamente.",
        );
        await refresh();
        return false;
      }

      setPayrolls((prev) =>
        prev.map((payroll) =>
          payroll.id === payrollId
            ? { ...payroll, lines, status: nextStatus }
            : payroll,
        ),
      );

      return true;
    },
    [payrolls, refresh],
  );

  const updatePayrollLine = useCallback(
    async (payrollId: string, lineId: string, amount: number) => {
      const payroll = payrolls.find((item) => item.id === payrollId);
      if (!payroll) return;
      const lines = payroll.lines.map((line) =>
        line.id === lineId
          ? { ...line, amount: Math.max(0, Math.round(amount)) }
          : line,
      );
      await persistPayrollLines(payrollId, lines);
    },
    [payrolls, persistPayrollLines],
  );

  const addPayrollLine = useCallback(
    async (payrollId: string, line: Omit<PayrollLine, "id">) => {
      const payroll = payrolls.find((item) => item.id === payrollId);
      if (!payroll) return;
      const saved = await persistPayrollLines(payrollId, [
        ...payroll.lines,
        { ...line, id: uid("line") },
      ]);
      if (saved) {
        toast.success("Concepto agregado a la nómina.");
      }
    },
    [payrolls, persistPayrollLines],
  );

  const removePayrollLine = useCallback(
    async (payrollId: string, lineId: string) => {
      const payroll = payrolls.find((item) => item.id === payrollId);
      if (!payroll) return;
      const saved = await persistPayrollLines(
        payrollId,
        payroll.lines.filter((line) => line.id !== lineId),
      );
      if (saved) {
        toast.success("Concepto eliminado de la nómina.");
      }
    },
    [payrolls, persistPayrollLines],
  );

  const reopenPaidPayroll = useCallback(async (payrollId: string, reason: string) => {
    const { error } = await supabase.rpc("payroll_reopen_paid" as never, {
      p_payroll_id: payrollId,
      p_reason: reason.trim(),
    } as never);
    if (error) {
      toast.error(error.message);
      return false;
    }
    await refresh();
    toast.success("Nómina reabierta como revisada. El pago real no se revierte.");
    return true;
  }, [refresh]);

  const setPayrollStatus = useCallback(
    async (payrollId: string, status: PayrollStatus) => {
      const payroll = payrolls.find((item) => item.id === payrollId);
      if (!payroll) return;
      const saved = await persistPayrollLines(
        payrollId,
        payroll.lines,
        status,
      );
      if (!saved) return;
      const label =
        status === "revisado"
          ? "marcada como revisada y bloqueada para edición"
          : status === "pagado"
            ? "marcada como pagada y visible para el empleado"
            : "reabierta como borrador";
      toast.success(`Nómina ${label}.`);
    },
    [payrolls, persistPayrollLines],
  );

  const addAccrualPayment = useCallback(
    async (input: {
      employeeId: string;
      concept: AccrualConcept;
      amount: number;
      days: number;
      paidAt: string;
      notes: string;
    }) => {
      const employee = employees.find((item) => item.id === input.employeeId);
      if (!employee) return;
      const { error } = await supabase
        .from("payroll_accrual_payments")
        .insert({
          company_id: employee.companyId,
          employee_id: employee.id,
          concept: input.concept,
          amount: Math.max(0, Math.round(input.amount)),
          days: Math.max(0, input.days),
          paid_at: input.paidAt,
          notes: input.notes,
        });
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Pago parcial registrado y disponible para la liquidación.");
    },
    [employees, refresh],
  );

  const deleteAccrualPayment = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("payroll_accrual_payments")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Registro eliminado.");
    },
    [refresh],
  );

  const settlementPayload = useCallback(
    (input: SettlementSaveInput) => {
      const employee = employees.find((item) => item.id === input.employeeId);
      if (!employee) return null;
      return {
        company_id: employee.companyId,
        employee_id: employee.id,
        cutoff: input.cutoff,
        pending_salary_days: input.pendingSalaryDays,
        vacation_days: input.vacationDays,
        other_earnings: input.otherEarnings,
        other_deductions: input.otherDeductions,
        extra_earnings: input.extraEarnings,
        lines: input.lines,
        prior_payments: input.priorPayments,
        gross: input.gross,
        legal_deductions: input.legalDeductions,
        total_deductions: input.totalDeductions,
        net: input.net,
        days_year: input.daysYear,
        days_semester: input.daysSemester,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      };
    },
    [employees],
  );

  const saveSettlement = useCallback(
    async (input: SettlementSaveInput) => {
      const payload = settlementPayload(input);
      if (!payload) {
        toast.error("No encontramos la ficha del colaborador.");
        return false;
      }
      const { error } = input.id
        ? await supabase
            .from("payroll_settlements")
            .update(payload)
            .eq("id", input.id)
        : await supabase
            .from("payroll_settlements")
            .upsert(payload, { onConflict: "employee_id,cutoff" });
      if (error) {
        toast.error(
          error.code === "23505"
            ? "Ya existe una liquidación de este colaborador con esa fecha de corte."
            : error.message,
        );
        return false;
      }
      await refresh();
      return true;
    },
    [settlementPayload, refresh],
  );

  const saveSettlements = useCallback(
    async (inputs: SettlementSaveInput[]) => {
      const payloads = inputs
        .map((input) => settlementPayload(input))
        .filter((payload): payload is NonNullable<typeof payload> => payload !== null);
      if (payloads.length === 0) return 0;
      const { error } = await supabase
        .from("payroll_settlements")
        .upsert(payloads, { onConflict: "employee_id,cutoff" });
      if (error) {
        toast.error(error.message);
        return 0;
      }
      await refresh();
      return payloads.length;
    },
    [settlementPayload, refresh],
  );

  const deleteSettlement = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("payroll_settlements")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Liquidación eliminada del historial.");
    },
    [refresh],
  );

  const finalizePayrollPeriod = useCallback(
    async (targetPeriod: string) => {
      if (!currentCompany) return;
      const { error } = await supabase
        .from("payroll_period_closures")
        .insert({
          company_id: currentCompany.id,
          period: targetPeriod,
        });
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Nómina del periodo finalizada.");
    },
    [currentCompany, refresh],
  );

  const reopenPayrollPeriod = useCallback(
    async (targetPeriod: string) => {
      if (!currentCompany) return;
      const { error } = await supabase
        .from("payroll_period_closures")
        .delete()
        .eq("company_id", currentCompany.id)
        .eq("period", targetPeriod);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Periodo reabierto para ajustes.");
    },
    [currentCompany, refresh],
  );

  const addAbsence = useCallback(
    async (input: {
      employeeId: string;
      type: AbsenceType;
      startDate: string;
      endDate: string;
      days: number;
      notes: string;
      status?: Absence["status"];
    }) => {
      const employee = employees.find((item) => item.id === input.employeeId);
      if (!employee) return;
      const { error } = await supabase.from("payroll_absences").insert({
        company_id: employee.companyId,
        employee_id: employee.id,
        type: input.type,
        start_date: input.startDate,
        end_date: input.endDate,
        days: input.days,
        status: input.status ?? "pendiente",
        notes: input.notes,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success(
        input.status === "aprobada"
          ? "Ausencia registrada."
          : "Solicitud enviada para aprobación.",
      );
    },
    [employees, refresh],
  );

  const setAbsenceStatus = useCallback(
    async (id: string, status: Absence["status"]) => {
      const { error } = await supabase
        .from("payroll_absences")
        .update({ status })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success(
        status === "aprobada"
          ? "Ausencia aprobada."
          : status === "rechazada"
            ? "Ausencia rechazada."
            : "Ausencia actualizada.",
      );
    },
    [refresh],
  );

  const updateAbsence = useCallback(
    async (
      id: string,
      patch: {
        type?: AbsenceType;
        startDate?: string;
        endDate?: string;
        days?: number;
        notes?: string;
      },
    ) => {
      const row: {
        type?: string;
        start_date?: string;
        end_date?: string;
        days?: number;
        notes?: string;
      } = {};
      if (patch.type !== undefined) row.type = patch.type;
      if (patch.startDate !== undefined) row.start_date = patch.startDate;
      if (patch.endDate !== undefined) row.end_date = patch.endDate;
      if (patch.days !== undefined) row.days = patch.days;
      if (patch.notes !== undefined) row.notes = patch.notes;
      const { error } = await supabase
        .from("payroll_absences")
        .update(row)
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Solicitud actualizada.");
    },
    [refresh],
  );

  const deleteAbsence = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("payroll_absences")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Solicitud eliminada.");
    },
    [refresh],
  );

  const addDocument = useCallback(
    async (input: {
      employeeId: string;
      kind: DocumentKind;
      title: string;
      status?: DocumentStatus;
      clause?: string;
    }) => {
      const employee = employees.find((item) => item.id === input.employeeId);
      if (!employee) return;
      if (
        input.kind.startsWith("contrato") &&
        input.kind !== documentKindForContract(employee.contractType)
      ) {
        toast.error(
          "El contrato debe coincidir con el tipo asignado en la ficha del empleado.",
        );
        return;
      }
      const existing = documents.find(
        (document) =>
          document.employeeId === employee.id && document.kind === input.kind,
      );
      if (existing) {
        // Solo un documento por empleado y tipo: si ya existe, se actualiza.
        const { error } = await supabase
          .from("payroll_documents")
          .update({
            title: input.title,
            status: input.status ?? existing.status,
            extra_clause: input.clause ?? existing.clause ?? "",
          })
          .eq("id", existing.id);
        if (error) {
          toast.error(error.message);
          return;
        }
        await refresh();
        toast.success("El documento ya estaba en la ficha; se actualizó.");
        return;
      }
      const { error } = await supabase.from("payroll_documents").insert({
        company_id: employee.companyId,
        employee_id: employee.id,
        kind: input.kind,
        title: input.title,
        status: input.status ?? "generado",
        extra_clause: input.clause ?? "",
      });
      if (error) {
        if (/duplicate key|unique constraint/i.test(error.message)) {
          await refresh();
          toast.info("Ese documento ya está registrado en la ficha.");
          return;
        }
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Documento generado y registrado en la ficha.");
    },
    [employees, documents, refresh],
  );

  const setDocumentStatus = useCallback(
    async (id: string, status: DocumentStatus) => {
      const { error } = await supabase
        .from("payroll_documents")
        .update({ status })
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Estado del documento actualizado.");
    },
    [refresh],
  );

  const createCompanyUser = useCallback(
    async (input: {
      companyId: string;
      role: "admin" | "employee";
      name: string;
      email: string;
      employeeId: string | null;
      password?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "create-company-user",
        { body: input },
      );

      if (error) {
        let message = "No pudimos crear la cuenta de acceso.";
        const context = (error as { context?: Response }).context;
        if (context) {
          try {
            const payload = await context.clone().json();
            if (payload?.error) message = payload.error;
          } catch {
            // Conserva el mensaje genérico.
          }
        }
        toast.error(message);
        return null;
      }

      if (!data?.ok) {
        toast.error(data?.error ?? "No pudimos crear la cuenta de acceso.");
        return null;
      }

      await refresh();
      return {
        created: Boolean(data.created),
        email: String(data.email ?? input.email),
        password: data.password ? String(data.password) : null,
        message: data.message ? String(data.message) : undefined,
      };
    },
    [refresh],
  );

  const resetCompanyUserPassword = useCallback(
    async (memberId: string, password?: string) => {
      const { data, error } = await supabase.functions.invoke(
        "reset-company-user-password",
        { body: { memberId, password } },
      );

      if (error) {
        let message = "No pudimos actualizar la contraseña.";
        const context = (error as { context?: Response }).context;
        if (context) {
          try {
            const payload = await context.clone().json();
            if (payload?.error) message = payload.error;
          } catch {
            // Conserva el mensaje genérico.
          }
        }
        toast.error(message);
        return null;
      }

      if (!data?.ok) {
        toast.error(data?.error ?? "No pudimos actualizar la contraseña.");
        return null;
      }

      toast.success("Contraseña actualizada.");
      return {
        email: String(data.email ?? ""),
        password: String(data.password ?? ""),
      };
    },
    [],
  );

  const inviteUser = useCallback(
    async (input: {
      companyId: string;
      name: string;
      email: string;
      role: "admin" | "employee";
      employeeId: string | null;
    }) => {
      const { error } = await supabase.from("payroll_invites").insert({
        company_id: input.companyId,
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        role: input.role,
        employee_id: input.employeeId,
      });
      if (error) {
        toast.error(
          error.code === "23505"
            ? "Ese correo ya tiene una invitación pendiente."
            : error.message,
        );
        return;
      }
      await refresh();
      toast.success(
        "Invitación creada. La persona debe registrarse o iniciar sesión con ese correo para quedar vinculada.",
      );
    },
    [refresh],
  );

  const cancelInvite = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("payroll_invites")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Invitación cancelada.");
    },
    [refresh],
  );

  const revokeMember = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("payroll_members")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refresh();
      toast.success("Acceso revocado. El usuario ya no verá esta empresa.");
    },
    [refresh],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      authLoading,
      dataLoading,
      viewRole,
      companies,
      employees,
      payrolls,
      absences,
      documents,
      accrualPayments,
      settlements,
      companySettlements,
      employeeSignatures,
      companySuspensions: suspensions,
      saveEmployeeSignature,
      members,
      invites,
      periodClosures,
      period,
      currentCompany,
      visibleCompanies,
      companyEmployees,
      companyPayrolls,
      companyAbsences,
      companyDocuments,
      currentEmployee,
      signIn,
      signUp,
      signOut,
      joinCompany,
      impersonateCompany,
      returnToOwner,
      setPeriod,
      refresh,
      addEmployee,
      updateEmployee,
      retireEmployee,
      reactivateEmployee,
      deleteEmployee,
      addCompany,
      updateCompany,
      toggleCompanyStatus,
      addConcept,
      removeConcept,
      generatePayroll,
      applyAnnualParameters,
      deletePayroll,
      payPayrollFortnight,
      deletePayrollFortnight,
      updatePayrollFortnightDate,
      updatePayrollLine,
      addPayrollLine,
      removePayrollLine,
      setPayrollStatus,
      reopenPaidPayroll,
      finalizePayrollPeriod,
      addAccrualPayment,
      deleteAccrualPayment,
      saveSettlement,
      saveSettlements,
      deleteSettlement,
      reopenPayrollPeriod,
      addAbsence,
      updateAbsence,
      deleteAbsence,
      setAbsenceStatus,
      addDocument,
      setDocumentStatus,
      createCompanyUser,
      resetCompanyUserPassword,
      inviteUser,
      cancelInvite,
      revokeMember,
    }),
    [
      session,
      authLoading,
      dataLoading,
      viewRole,
      companies,
      employees,
      payrolls,
      absences,
      documents,
      period,
      currentCompany,
      visibleCompanies,
      companyEmployees,
      companyPayrolls,
      companyAbsences,
      companyDocuments,
      currentEmployee,
      signIn,
      signUp,
      signOut,
      joinCompany,
      impersonateCompany,
      returnToOwner,
      refresh,
      addEmployee,
      updateEmployee,
      retireEmployee,
      reactivateEmployee,
      deleteEmployee,
      addCompany,
      updateCompany,
      toggleCompanyStatus,
      addConcept,
      removeConcept,
      generatePayroll,
      applyAnnualParameters,
      deletePayroll,
      payPayrollFortnight,
      deletePayrollFortnight,
      updatePayrollFortnightDate,
      updatePayrollLine,
      addPayrollLine,
      removePayrollLine,
      setPayrollStatus,
      reopenPaidPayroll,
      finalizePayrollPeriod,
      addAccrualPayment,
      deleteAccrualPayment,
      saveSettlement,
      saveSettlements,
      deleteSettlement,
      reopenPayrollPeriod,
      addAbsence,
      updateAbsence,
      deleteAbsence,
      setAbsenceStatus,
      addDocument,
      setDocumentStatus,
      createCompanyUser,
      resetCompanyUserPassword,
      inviteUser,
      cancelInvite,
      revokeMember,
      members,
      invites,
      settlements,
      companySettlements,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

