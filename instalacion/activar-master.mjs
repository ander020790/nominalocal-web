import { createClient } from "@supabase/supabase-js";

const EMAIL = "anderson-almeyda@hotmail.com";
const NAME = "anderson-almeyda";
const url = process.env.NOMINA_LOCAL_URL;
const key = process.env.NOMINA_LOCAL_ADMIN_KEY;
if (!url || !key || !/^http:\/\/(127\.0\.0\.1|localhost):55321\/?$/.test(url)) {
  throw new Error("Solo se permite Supabase local en el puerto 55321.");
}
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const { password } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
if (typeof password !== "string" || password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { count, error: countError } = await admin.from("payroll_members").select("id", { count: "exact", head: true }).eq("role", "owner");
if (countError) throw countError;
if (count !== 0) throw new Error("Ya existe un MASTER. No se modificó nada.");
const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw usersError;
if (users.users.length !== 0) throw new Error("La instalación ya contiene cuentas de acceso. Activación inicial cancelada.");
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: EMAIL, password, email_confirm: true, user_metadata: { full_name: NAME },
});
if (createError || !created.user) throw createError ?? new Error("No se creó la cuenta.");
const { error: memberError } = await admin.from("payroll_members").insert({
  user_id: created.user.id, email: EMAIL, name: NAME, role: "owner", company_id: null, employee_id: null,
});
if (memberError) {
  await admin.auth.admin.deleteUser(created.user.id);
  throw memberError;
}
console.log("MASTER creado correctamente: " + EMAIL);
