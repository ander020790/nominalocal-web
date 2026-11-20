// Crea cuentas de acceso para una empresa. Solo puede invocarlo el usuario principal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const generatePassword = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const pool = letters + digits + symbols;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const body = Array.from(bytes)
    .map((byte) => pool[byte % pool.length])
    .join("");
  return `${body}Aa1!`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      console.error("Faltan variables de entorno de Enter Cloud");
      return json(
        { ok: false, error: "Configuración del servidor incompleta." },
        500,
      );
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return json({ ok: false, error: "Sesión requerida." }, 401);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ ok: false, error: "Sesión no válida." }, 401);
    }

    const { data: caller } = await admin
      .from("payroll_members")
      .select("role, company_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    const body = await req.json().catch(() => ({}));
    const companyId = clean(body.companyId);
    const role = clean(body.role);
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const suppliedPassword = clean(body.password);
    const employeeId = clean(body.employeeId) || null;

    if (!companyId || !isEmail(email) || !name) {
      return json(
        { ok: false, error: "Indica empresa, nombre y un correo válido." },
        200,
      );
    }
    if (role !== "admin" && role !== "employee") {
      return json({ ok: false, error: "Tipo de acceso no válido." }, 200);
    }
    if (suppliedPassword && suppliedPassword.length < 8) {
      return json(
        { ok: false, error: "La contraseña debe tener al menos 8 caracteres." },
        200,
      );
    }

    const isOwner = caller?.role === "owner";
    const isCompanyAdmin =
      caller?.role === "admin" && caller.company_id === companyId;
    if (!isOwner && !isCompanyAdmin) {
      return json(
        { ok: false, error: "No tienes permiso para crear esta cuenta." },
        403,
      );
    }
    if (!isOwner && role !== "employee") {
      return json(
        {
          ok: false,
          error:
            "Solo el usuario principal puede crear cuentas de administrador.",
        },
        403,
      );
    }

    const { data: company } = await admin
      .from("payroll_companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();
    if (!company) {
      return json({ ok: false, error: "La empresa no existe." }, 200);
    }

    let employeeDoc = "";
    if (role === "employee") {
      if (!employeeId) {
        return json(
          { ok: false, error: "Selecciona el empleado para este acceso." },
          200,
        );
      }
      const { data: employee } = await admin
        .from("payroll_employees")
        .select("id, company_id, doc_number")
        .eq("id", employeeId)
        .maybeSingle();
      if (!employee || employee.company_id !== companyId) {
        return json(
          { ok: false, error: "El empleado no pertenece a esta empresa." },
          200,
        );
      }
      employeeDoc = String(employee.doc_number ?? "").replace(/\D/g, "");
    }

    // Los empleados inician con su cédula como contraseña.
    let password = suppliedPassword;
    if (!password && role === "employee" && employeeDoc.length >= 6) {
      password = employeeDoc;
    }
    password = password || generatePassword();
    let userId = "";
    let created = false;

    const { data: createdUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

    if (createError || !createdUser.user) {
      if (!/already|registered|exists/i.test(createError?.message ?? "")) {
        console.error("No se pudo crear el usuario", createError?.message);
        return json(
          { ok: false, error: "No pudimos crear la cuenta de acceso." },
          200,
        );
      }

      const { data: list, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) {
        console.error("No se pudo consultar usuarios", listError.message);
        return json(
          { ok: false, error: "No pudimos verificar la cuenta existente." },
          200,
        );
      }
      const existing = list?.users.find(
        (user) => user.email?.toLowerCase() === email,
      );
      if (!existing) {
        return json(
          { ok: false, error: "El correo ya está en uso y no pudimos vincularlo." },
          200,
        );
      }
      userId = existing.id;
    } else {
      userId = createdUser.user.id;
      created = true;
    }

    const { data: membership } = await admin
      .from("payroll_members")
      .select("id, role, company_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (membership?.role === "owner") {
      return json(
        { ok: false, error: "Ese correo pertenece al usuario principal." },
        200,
      );
    }
    if (membership?.company_id && membership.company_id !== companyId) {
      return json(
        {
          ok: false,
          error: "Ese correo ya está vinculado a otra empresa.",
        },
        200,
      );
    }

    const payload = {
      user_id: userId,
      email,
      name,
      role,
      company_id: companyId,
      employee_id: role === "employee" ? employeeId : null,
    };

    const { error: memberError } = membership
      ? await admin
          .from("payroll_members")
          .update(payload)
          .eq("id", membership.id)
      : await admin.from("payroll_members").insert(payload);

    if (memberError) {
      console.error("No se pudo asignar la membresía", memberError.message);
      if (created) {
        await admin.auth.admin.deleteUser(userId);
      }
      return json(
        { ok: false, error: "No pudimos asignar el acceso a la empresa." },
        200,
      );
    }

    console.log(
      `Cuenta ${created ? "creada" : "vinculada"} para ${email} en ${company.name} como ${role}`,
    );

    return json({
      ok: true,
      userId,
      email,
      created,
      password: created ? password : null,
      message: created
        ? "Cuenta creada. Comparte el correo y la contraseña temporal."
        : "La cuenta ya existía y quedó vinculada a la empresa.",
    });
  } catch (error) {
    console.error("Error inesperado", error);
    return json(
      { ok: false, error: "Ocurrió un error inesperado en el servidor." },
      500,
    );
  }
});
