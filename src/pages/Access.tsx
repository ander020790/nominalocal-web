import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  FileSignature,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useApp } from "@/context/app-context-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const highlights = [
  {
    icon: Wallet,
    title: "Nómina colombiana al día",
    text: "Salud, pensión, ARL, prestaciones, recargos y retención con parámetros 2026.",
  },
  {
    icon: Building2,
    title: "Empresas independientes",
    text: "Un usuario principal crea cada empresa y todo se configura por separado.",
  },
  {
    icon: FileSignature,
    title: "Documentos listos para firmar",
    text: "Contratos, pagaré, confidencialidad y política de venta en PDF.",
  },
];

const authErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos. Usa la clave que te asignó el usuario principal.";
  }
  if (message.includes("email not confirmed")) {
    return "Tu correo aún no está confirmado. Pide al usuario principal que revise tu cuenta.";
  }
  if (message.includes("for security purposes")) {
    return "Espera unos segundos antes de volver a intentarlo.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  }
  if (error instanceof Error && error.message) {
    return `No pudimos completar el acceso: ${error.message}`;
  }
  return "No pudimos completar el acceso. Verifica tus datos.";
};

export const Access = () => {
  const { session, authLoading, signIn, signOut } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    if (session.role === "owner") navigate("/empresas", { replace: true });
    else if (session.role === "admin") navigate("/panel", { replace: true });
    else if (session.role === "employee") navigate("/portal", { replace: true });
  }, [session, navigate]);

  const navigateForRole = (role: string) => {
    if (role === "owner") navigate("/empresas");
    else if (role === "admin") navigate("/panel");
    else if (role === "employee") navigate("/portal");
  };

  const submit = async () => {
    setError("");
    if (!email || password.length < 6) {
      setError("Ingresa tu correo y la contraseña asignada.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      // Los empleados suelen escribir la cédula con puntos o espacios.
      const digits = password.replace(/\D/g, "");
      const looksLikeDocument = /^[\d.\s-]+$/.test(password);
      if (digits && digits !== password && looksLikeDocument) {
        try {
          await signIn(email, digits);
          return;
        } catch {
          // Continúa con el mensaje de error original.
        }
      }
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando Nómina Clara…
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden brand-gradient p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 grid-pattern opacity-[0.12]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
              <Wallet className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold">Nómina Clara</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">
                Nómina y RRHH · Colombia
              </p>
            </div>
          </div>

          <h1 className="mt-16 max-w-md font-display text-[40px] font-extrabold leading-[1.08]">
            Toda la nómina, los contratos y la operación de tus puntos de venta.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/70">
            Plataforma multiempresa con parámetros propios por compañía,
            liquidación mensual, documentos laborales y portal para cada
            colaborador.
          </p>

          <div className="mt-10 space-y-4">
            {highlights.map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/12">
                  <item.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs leading-relaxed text-primary-foreground/60">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-primary-foreground/60">
          <ShieldCheck className="size-4" />
          Datos separados por empresa · Roles de RRHH y empleado
        </div>
      </div>

      <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="brand-gradient flex size-10 items-center justify-center rounded-xl">
              <Wallet className="size-5 text-primary-foreground" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold">Nómina Clara</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Nómina y RRHH · Colombia
              </p>
            </div>
          </div>

          {session?.role === "pending" ? (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Cuenta pendiente de acceso
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  La cuenta {session.email} existe, pero aún no está asignada a
                  una empresa.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  El usuario principal debe crearte el acceso desde
                  <span className="font-medium text-foreground"> Usuarios</span>{" "}
                  y compartirte la contraseña. No necesitas registrarte de nuevo.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void signOut()}
                >
                  Usar otra cuenta
                </Button>
              </div>
            </div>
          ) : session ? (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Sesión iniciada
              </h2>
              <p className="text-sm text-muted-foreground">
                Entraste como {session.name} · {session.email}
              </p>
              <Button className="w-full" onClick={() => navigateForRole(session.role)}>
                Continuar <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void signOut()}
              >
                Cerrar sesión
              </Button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Entra a tu espacio
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Accede con el correo y la contraseña que te asignó el usuario
                principal.
              </p>

              <div className="mt-6 space-y-3">
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Correo electrónico
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nombre@empresa.co"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Contraseña
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tu contraseña"
                    autoComplete="current-password"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submit();
                    }}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Empleados: su cédula, sin puntos ni espacios.
                  </p>
                </div>

                {error ? (
                  <p className="rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                ) : null}

                <Button className="w-full" onClick={submit} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Ingresar
                  {!busy ? <ArrowRight className="size-4" /> : null}
                </Button>
              </div>

              <div className="mt-8 rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-foreground">
                  Acceso creado por el usuario principal
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Si no tienes cuenta o clave, pide al usuario principal que te
                  cree el acceso desde Usuarios. No hay registro público. Los
                  empleados usan su cédula como clave inicial.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
