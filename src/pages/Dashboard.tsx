import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  FileSignature,
  Flame,
  Plus,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { StatusPill } from "@/components/common/status-pill";
import { EmployeeAvatar } from "@/components/common/employee-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/context/app-context-value";
import { payrollTotals } from "@/lib/payroll";
import {
  formatCOP,
  formatDate,
  formatMonth,
  formatMonthShort,
  formatNumber,
  fullName,
  lastPeriods,
} from "@/lib/format";

export const Dashboard = () => {
  const {
    currentCompany,
    companyEmployees,
    companyPayrolls,
    companyAbsences,
    companyDocuments,
    period,
    setPeriod,
  } = useApp();
  const navigate = useNavigate();

  const activeEmployees = companyEmployees.filter(
    (employee) => employee.status === "activo",
  );
  const periodPayrolls = companyPayrolls.filter(
    (payroll) => payroll.period === period,
  );

  const totals = periodPayrolls.reduce(
    (acc, payroll) => {
      const result = payrollTotals(payroll.lines);
      return {
        gross: acc.gross + result.gross,
        deductions: acc.deductions + result.deductions,
        employer: acc.employer + result.employer,
        net: acc.net + result.net,
        totalCost: acc.totalCost + result.totalCost,
        retention:
          acc.retention +
          payroll.lines
            .filter((line) => line.label === "Retención en la fuente")
            .reduce((sum, line) => sum + line.amount, 0),
      };
    },
    {
      gross: 0,
      deductions: 0,
      employer: 0,
      net: 0,
      totalCost: 0,
      retention: 0,
    },
  );

  const trend = lastPeriods(6).map((item) => {
    const cost = companyPayrolls
      .filter((payroll) => payroll.period === item)
      .reduce((sum, payroll) => {
        const result = payrollTotals(payroll.lines);
        return sum + result.totalCost;
      }, 0);
    return {
      period: item,
      label: formatMonthShort(item),
      cost,
    };
  });

  const statusCounts = {
    borrador: periodPayrolls.filter((p) => p.status === "borrador").length,
    revisado: periodPayrolls.filter((p) => p.status === "revisado").length,
    pagado: periodPayrolls.filter((p) => p.status === "pagado").length,
  };

  const pendingAbsences = companyAbsences.filter(
    (absence) => absence.status === "pendiente",
  );
  const pendingDocuments = companyDocuments.filter(
    (document) => document.status !== "firmado",
  );

  const posCost = (currentCompany?.pointsOfSale ?? []).map((pos) => {
    const cost = periodPayrolls.reduce((sum, payroll) => {
      const employee = companyEmployees.find(
        (item) => item.id === payroll.employeeId,
      );
      if (employee?.pointOfSaleId !== pos.id) return sum;
      return sum + payrollTotals(payroll.lines).totalCost;
    }, 0);
    return { ...pos, cost };
  });
  const maxPosCost = Math.max(1, ...posCost.map((item) => item.cost));

  const recentPayrolls = periodPayrolls.slice(0, 5);

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany?.name ?? "Panel"}
        title="Resumen de nómina"
        description={`Liquidación del periodo ${formatMonth(period)} con parámetros ${currentCompany?.params.year}. Todos los importes están en pesos colombianos.`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/documentos")}>
              <FileSignature className="size-4" /> Generar documento
            </Button>
            <Button onClick={() => navigate("/nominas")}>
              <Wallet className="size-4" /> Ir a nóminas
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Plantilla activa"
          value={formatNumber(activeEmployees.length)}
          hint={`${companyEmployees.filter((e) => e.status === "retirado").length} retirados en el histórico`}
          icon={Users}
          tone="brand"
        />
        <StatCard
          label="Total devengado"
          value={formatCOP(totals.gross)}
          hint={`${periodPayrolls.length} recibos del periodo`}
          icon={Banknote}
          tone="success"
        />
        <StatCard
          label="Neto a pagar"
          value={formatCOP(totals.net)}
          hint={`Retenciones por ${formatCOP(totals.retention)}`}
          icon={CircleDollarSign}
          tone="info"
        />
        <StatCard
          label="Coste empresa"
          value={formatCOP(totals.totalCost)}
          hint="Incluye aportes y provisiones"
          icon={TrendingUp}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="surface-card border-0">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="font-display text-base font-semibold">
                Evolución del coste total
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Devengos más aportes y provisiones de los últimos meses
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
              <Flame className="size-3" /> Nómina al día
            </span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: -8, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(value: number) =>
                      `${Math.round(value / 1_000_000)}M`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatCOP(value), "Coste"]}
                    labelFormatter={(label) => `Mes ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2.5}
                    fill="url(#costGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-semibold">
              Estado del periodo
            </CardTitle>
            <p className="text-xs text-muted-foreground">{formatMonth(period)}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["Pagadas", statusCounts.pagado, "bg-success"],
                ["Revisadas", statusCounts.revisado, "bg-info"],
                ["En borrador", statusCounts.borrador, "bg-warning"],
              ] as const
            ).map(([label, count, color]) => {
              const percent = periodPayrolls.length
                ? Math.round((count / periodPayrolls.length) * 100)
                : 0;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground">
                      {count} de {periodPayrolls.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Coste por punto de venta
              </p>
              <div className="mt-2.5 space-y-2.5">
                {posCost.map((pos) => (
                  <div key={pos.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-foreground">{pos.name}</span>
                      <span className="ml-2 shrink-0 font-medium text-muted-foreground">
                        {formatCOP(pos.cost)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full brand-gradient"
                        style={{
                          width: `${Math.round((pos.cost / maxPosCost) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="surface-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="font-display text-base font-semibold">
              Últimos recibos del periodo
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/nominas")}
            >
              Ver todas <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="divide-y divide-border">
              {recentPayrolls.map((payroll) => {
                const employee = companyEmployees.find(
                  (item) => item.id === payroll.employeeId,
                );
                if (!employee) return null;
                const result = payrollTotals(payroll.lines);
                return (
                  <Link
                    key={payroll.id}
                    to="/nominas"
                    className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                  >
                    <EmployeeAvatar
                      firstName={employee.firstName}
                      lastName={employee.lastName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {fullName(employee)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {employee.position}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCOP(result.net)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Neto</p>
                    </div>
                    <StatusPill status={payroll.status} />
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-6 pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Receipt className="size-3.5" /> {periodPayrolls.length} recibos
                liquidados
              </span>
              <button
                type="button"
                onClick={() => setPeriod(period)}
                className="font-semibold text-primary"
              >
                {formatMonth(period)}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Pendientes por atender
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                to="/ausencias"
                className="flex items-start gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                  <CalendarClock className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {pendingAbsences.length} solicitudes de ausencia
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Vacaciones y permisos por aprobar
                  </p>
                </div>
                <ArrowRight className="mt-1 size-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/documentos"
                className="flex items-start gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                  <FileSignature className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {pendingDocuments.length} documentos sin firmar
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Contratos, pagarés y políticas pendientes
                  </p>
                </div>
                <ArrowRight className="mt-1 size-3.5 text-muted-foreground" />
              </Link>
              <Link
                to="/ajustes"
                className="flex items-start gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Sparkles className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Parámetros del año {currentCompany?.params.year}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    SMMLV {formatCOP(currentCompany?.params.smmlv ?? 0)} · UVT{" "}
                    {formatCOP(currentCompany?.params.uvt ?? 0)}
                  </p>
                </div>
                <ArrowRight className="mt-1 size-3.5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>

          <Card className="surface-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Ausencias recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {companyAbsences.slice(0, 3).map((absence) => {
                const employee = companyEmployees.find(
                  (item) => item.id === absence.employeeId,
                );
                return (
                  <div key={absence.id} className="flex items-center gap-2.5">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {employee ? fullName(employee) : "Empleado"}
                      </p>
                      <p className="text-[11px] capitalize text-muted-foreground">
                        {absence.type} · {formatDate(absence.startDate)}
                      </p>
                    </div>
                    <StatusPill status={absence.status} />
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate("/ausencias")}
              >
                <Plus className="size-3.5" /> Registrar ausencia
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
