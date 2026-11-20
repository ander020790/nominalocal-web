import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  KeyRound,
  Building2,
  AlertTriangle,
  Ban,
  CalendarDays,
  CalendarPlus,
  Calculator,
  ChevronDown,
  HandCoins,
  FileSignature,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Sun,
  Users,
  Wallet,
  Settings as SettingsIcon,
  Sparkles,
  Store,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/context/app-context-value";
import { ChangePasswordDialog } from "@/components/layout/change-password-dialog";
import { InstallAppButton } from "@/components/layout/install-app-button";
import { cn } from "@/lib/utils";
import { formatMonth, initials } from "@/lib/format";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  employeeLabel?: string;
}

const adminNav: NavItem[] = [
  { to: "/panel", label: "Resumen", icon: LayoutDashboard },
  { to: "/empleados", label: "Empleados", icon: Users },
  { to: "/usuarios", label: "Usuarios", icon: Users },
  { to: "/nominas", label: "Nóminas", icon: Wallet },
  { to: "/liquidaciones", label: "Liquidaciones", icon: Calculator },
  { to: "/prestamos", label: "Préstamos", icon: HandCoins },
  { to: "/ausencias", label: "Ausencias", icon: CalendarDays },
  { to: "/suspensiones", label: "Suspensiones", icon: Ban },
  { to: "/llamados", label: "Llamados de atención", icon: AlertTriangle },
  {
    to: "/documentos",
    label: "Documentos",
    icon: FileSignature,
    employeeLabel: "Mis documentos",
  },
  { to: "/informes", label: "Informes", icon: BarChart3 },
  { to: "/ajustes", label: "Ajustes", icon: SettingsIcon },
];

const ownerNav: NavItem[] = [
  { to: "/empresas", label: "Empresas", icon: Building2 },
  { to: "/usuarios", label: "Usuarios", icon: Users },
];

const employeeNav: NavItem[] = [
  { to: "/portal", label: "Mi portal", icon: LayoutDashboard },
  { to: "/portal/nomina", label: "Mis recibos", icon: Wallet },
  { to: "/portal/documentos", label: "Mis documentos", icon: FileSignature },
  { to: "/portal/vacaciones", label: "Vacaciones", icon: CalendarDays },
  { to: "/portal/permisos", label: "Permisos", icon: CalendarPlus },
  { to: "/portal/prestamos", label: "Préstamos", icon: HandCoins },
];

const allowedFor = (role: string, path: string) => {
  if (role === "owner")
    return path.startsWith("/empresas") || path.startsWith("/usuarios");
  if (role === "employee")
    return path === "/portal" || path.startsWith("/portal/");
  if (role === "pending") return false;
  return !path.startsWith("/empresas") && !path.startsWith("/portal");
};

const roleLabel = (role: string) =>
  role === "owner"
    ? "Usuario principal"
    : role === "admin"
      ? "Administración de RRHH"
      : role === "employee"
        ? "Portal del empleado"
        : "Sin empresa asignada";

const useTheme = () => {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nc-theme");
    const isDark = stored ? stored === "dark" : false;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    setDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("nc-theme", next ? "dark" : "light");
      return next;
    });
  };

  return { dark, toggle };
};

const Brand = () => (
  <Link to="/" className="flex items-center gap-3">
    <span className="brand-gradient flex size-10 items-center justify-center rounded-xl shadow-lg shadow-primary/30">
      <Wallet className="size-5 text-primary-foreground" />
    </span>
    <span className="leading-tight">
      <span className="block font-display text-[15px] font-extrabold tracking-tight text-sidebar-foreground">
        Nómina Clara
      </span>
      <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/50">
        Nómina y RRHH · Colombia
      </span>
    </span>
  </Link>
);

const SidebarContent = ({
  onNavigate,
  onChangePassword,
}: {
  onNavigate?: () => void;
  onChangePassword: () => void;
}) => {
  const {
    session,
    viewRole,
    currentCompany,
    companies,
    returnToOwner,
    signOut,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  if (!session) return null;

  const nav =
    viewRole === "owner"
      ? ownerNav
      : viewRole === "employee"
        ? employeeNav
        : adminNav;
  const isOwnerActing = session.role === "owner" && viewRole === "admin";

  const handleSignOut = () => {
    void signOut();
    navigate("/acceso");
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pb-5 pt-6">
        <Brand />
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            {viewRole === "owner" ? "Plataforma" : "Empresa activa"}
          </p>
          {viewRole === "owner" ? (
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-sidebar-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {companies.length}{" "}
                  {companies.length === 1 ? "empresa" : "empresas"}
                </p>
                <p className="text-[11px] text-sidebar-foreground/55">
                  Espacios independientes
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
                <Store className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {currentCompany?.name}
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/55">
                  NIT {currentCompany?.nit}
                </p>
              </div>
            </div>
          )}
          {isOwnerActing ? (
            <button
              type="button"
              onClick={() => {
                returnToOwner();
                navigate("/empresas");
                onNavigate?.();
              }}
              className="mt-3 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-sidebar-primary transition-colors hover:bg-sidebar-primary/10"
            >
              <ArrowLeft className="size-3.5" />
              Volver al panel de empresas
            </button>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 scrollbar-slim">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
            {viewRole === "employee" ? "Mi espacio" : "Gestión"}
          </p>
          {nav.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== "/panel" &&
                item.to !== "/empresas" &&
                item.to !== "/portal" &&
                location.pathname.startsWith(item.to));
            const label =
              viewRole === "employee" && item.employeeLabel
                ? item.employeeLabel
                : item.label;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" />
                ) : null}
                <item.icon
                  className={cn(
                    "size-[18px] shrink-0 transition-colors",
                    active
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80",
                  )}
                />
                {label}
              </Link>
            );
          })}
        </div>

        {viewRole === "admin" ? (
          <div className="mx-1 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-sidebar-primary">
              <Sparkles className="size-3.5" />
              Parámetros 2026
            </div>
            <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
              Nómina actualizada con la Ley 2466 de 2025 y jornada de 42 horas.
            </p>
          </div>
        ) : null}

      </nav>

      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent/70"
            >
              <span className="brand-gradient flex size-9 items-center justify-center rounded-full text-xs font-bold text-primary-foreground">
                {initials(
                  session.name.split(" ")[0] ?? "",
                  session.name.split(" ")[1] ?? "",
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {session.name}
                </span>
                <span className="block truncate text-[11px] text-sidebar-foreground/50">
                  {roleLabel(viewRole)}
                </span>
              </span>
              <ChevronDown className="size-4 text-sidebar-foreground/40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {session.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {viewRole === "owner" ? (
              <DropdownMenuItem onClick={() => navigate("/empresas")}>
                <Building2 className="mr-2 size-4" /> Panel de empresas
              </DropdownMenuItem>
            ) : viewRole === "employee" ? (
              <DropdownMenuItem onClick={() => navigate("/portal")}>
                <Users className="mr-2 size-4" /> Mi portal
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => navigate("/ajustes")}>
                <SettingsIcon className="mr-2 size-4" /> Ajustes
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onChangePassword}>
              <KeyRound className="mr-2 size-4" /> Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export const AppShell = () => {
  const {
    session,
    viewRole,
    authLoading,
    dataLoading,
    companies,
    visibleCompanies,
    currentCompany,
    impersonateCompany,
    period,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (authLoading && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando tu espacio…
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/acceso" replace />;
  }

  if (viewRole === "pending") {
    return <Navigate to="/acceso" replace />;
  }

  if (!allowedFor(viewRole, location.pathname)) {
    const fallback =
      viewRole === "owner"
        ? "/empresas"
        : viewRole === "employee"
          ? "/portal"
          : "/panel";
    return <Navigate to={fallback} replace />;
  }

  const currentNav =
    viewRole === "owner"
      ? ownerNav
      : viewRole === "employee"
        ? employeeNav
        : adminNav;
  const active =
    currentNav.find(
      (item) =>
        item.to === location.pathname ||
        (item.to !== "/panel" &&
          item.to !== "/empresas" &&
          item.to !== "/usuarios" &&
          item.to !== "/portal" &&
          location.pathname.startsWith(item.to)),
    ) ?? currentNav[0];

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] lg:block">
        <SidebarContent onChangePassword={() => setPasswordOpen(true)} />
      </aside>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] border-0 p-0">
                <SidebarContent
                  onNavigate={() => setMobileOpen(false)}
                  onChangePassword={() => {
                    setMobileOpen(false);
                    setPasswordOpen(true);
                  }}
                />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {viewRole === "owner" ? "Plataforma" : currentCompany?.name}
              </p>
              <p className="truncate font-display text-sm font-bold text-foreground">
                {active?.label}
              </p>
            </div>
            {dataLoading ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {viewRole === "owner" ? (
              <span className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
                <Building2 className="size-3.5 text-primary" />
                {companies.length} empresas ·{" "}
                {companies.filter((company) => company.status === "activa").length}{" "}
                activas
              </span>
            ) : (
              <>
                <span className="hidden rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground md:inline-flex">
                  {formatMonth(period)}
                </span>
                {session?.role === "owner" ? (
                  <Select
                    value={currentCompany?.id}
                    onValueChange={(value) => {
                      impersonateCompany(value);
                      navigate("/panel");
                    }}
                  >
                    <SelectTrigger className="hidden h-9 w-[190px] border-border bg-card text-xs sm:flex">
                      <SelectValue placeholder="Cambiar empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </>
            )}

            <InstallAppButton />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Cambiar tema"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notificaciones"
              onClick={() =>
                navigate(
                  viewRole === "employee"
                    ? "/portal"
                    : viewRole === "owner"
                      ? "/empresas"
                      : "/nominas",
                )
              }
            >
              <Bell className="size-4" />
              <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-warning" />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
          {dataLoading ? (
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
};
