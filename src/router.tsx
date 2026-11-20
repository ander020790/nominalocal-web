import { AppShell } from "./components/layout/app-shell";
import { Access } from "./pages/Access";
import { Absences } from "./pages/Absences";
import { Companies } from "./pages/Companies";
import { Dashboard } from "./pages/Dashboard";
import { Documents } from "./pages/Documents";
import { Employees } from "./pages/Employees";
import { Loans } from "./pages/Loans";
import { NotFound } from "./pages/NotFound";
import { Payrolls } from "./pages/Payrolls";
import { Portal } from "./pages/Portal";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Settlements } from "./pages/Settlements";
import { Suspensions } from "./pages/Suspensions";
import { Warnings } from "./pages/Warnings";
import { Users } from "./pages/Users";

export const routers = [
  {
    path: "/acceso",
    name: "acceso",
    element: <Access />,
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, name: "home", element: <Dashboard /> },
      { path: "panel", name: "panel", element: <Dashboard /> },
      { path: "empresas", name: "empresas", element: <Companies /> },
      { path: "usuarios", name: "usuarios", element: <Users /> },
      { path: "empleados", name: "empleados", element: <Employees /> },
      { path: "nominas", name: "nominas", element: <Payrolls /> },
      { path: "liquidaciones", name: "liquidaciones", element: <Settlements /> },
      { path: "prestamos", name: "prestamos", element: <Loans /> },
      { path: "ausencias", name: "ausencias", element: <Absences /> },
      { path: "suspensiones", name: "suspensiones", element: <Suspensions /> },
      { path: "llamados", name: "llamados", element: <Warnings /> },
      { path: "documentos", name: "documentos", element: <Documents /> },
      { path: "informes", name: "informes", element: <Reports /> },
      { path: "ajustes", name: "ajustes", element: <Settings /> },
      { path: "portal", name: "portal", element: <Portal /> },
      { path: "portal/nomina", name: "portal-nomina", element: <Portal /> },
      {
        path: "portal/documentos",
        name: "portal-documentos",
        element: <Portal />,
      },
      {
        path: "portal/vacaciones",
        name: "portal-vacaciones",
        element: <Portal />,
      },
      {
        path: "portal/permisos",
        name: "portal-permisos",
        element: <Portal />,
      },
      {
        path: "portal/prestamos",
        name: "portal-prestamos",
        element: <Portal />,
      },
    ],
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
