// Asigna una contraseña nueva a una cuenta de empresa. Solo el usuario principal.
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
    const memberId = typeof body.memberId === "string" ? body.memberId : "";
    const suppliedPassword =
      typeof body.password === "string" ? body.password.trim() : "";

    if (!memberId) {
      return json({ ok: false, error: "Selecciona el usuario." }, 200);
    }
    if (suppliedPassword && suppliedPassword.length < 8) {
      return json(
        { ok: false, error: "La contraseña debe tener al menos 8 caracteres." },
        200,
      );
    }

    const { data: member } = await admin
      .from("payroll_members")
      .select("id, user_id, email, role, employee_id")
      .eq("id", memberId)
      .maybeSingle();

    if (!member || member.role === "owner") {
      return json(
        { ok: false, error: "No se puede asignar clave a este usuario." },
        200,
      );
    }

    const isOwner = caller?.role === "owner";
    const isCompanyAdmin =
      caller?.role === "admin" &&
      member.role === "employee" &&
      caller.company_id === member.company_id;
    if (!isOwner && !isCompanyAdmin) {
      return json(
        {
          ok: false,
          error:
            "Solo el usuario principal o el administrador de RRHH de la empresa pueden asignar esta clave.",
        },
        403,
      );
    }

    let password = suppliedPassword;
    if (!password && member.role === "employee" && member.employee_id) {
      const { data: employee } = await admin
        .from("payroll_employees")
        .select("doc_number")
        .eq("id", member.employee_id)
        .maybeSingle();
      const digits = String(employee?.doc_number ?? "").replace(/\D/g, "");
      if (digits.length >= 6) password = digits;
    }
    password = password || generatePassword();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      member.user_id,
      { password, email_confirm: true },
    );

    if (updateError) {
      console.error("No se pudo actualizar la clave", updateError.message);
      return json(
        { ok: false, error: "No pudimos actualizar la contraseña." },
        200,
      );
    }

    console.log(`Clave actualizada para ${member.email}`);
    return json({ ok: true, email: member.email, password });
  } catch (error) {
    console.error("Error inesperado", error);
    return json(
      { ok: false, error: "Ocurrió un error inesperado en el servidor." },
      500,
    );
  }
});
