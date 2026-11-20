import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, PieChart as PieIcon, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/context/app-context-value";
import { monthlyCompensation, payrollTotals } from "@/lib/payroll";
import {
  formatCOP,
  formatMonth,
  formatMonthShort,
  formatNumber,
  lastPeriods,
} from "@/lib/format";

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export const Reports = () => {
  const { currentCompany, companyEmployees, companyPayrolls, period } = useApp();

  const periodPayrolls = companyPayrolls.filter(
    (payroll) => payroll.period === period,
  );

  const posData = (currentCompany?.pointsOfSale ?? []).map((pos) => {
    const employees = companyEmployees.filter(
      (employee) => employee.pointOfSaleId === pos.id && employee.status === "activo",
    );
    const cost = periodPayrolls.reduce((sum, payroll) => {
      const employee = companyEmployees.find(
        (item) => item.id === payroll.employeeId,
      );
      if (employee?.pointOfSaleId !== pos.id) return sum;
      return sum + payrollTotals(payroll.lines).totalCost;
    }, 0);
    return { name: pos.name, cost, employees: employees.length };
  });

  const contractData = ["indefinido", "fijo", "obra-labor", "prestacion-servicios"]
    .map((type) => ({
      name:
        type === "indefinido"
          ? "Indefinido"
          : type === "fijo"
            ? "Término fijo"
            : type === "obra-labor"
              ? "Obra o labor"
              : "Prestación",
      value: companyEmployees.filter(
        (employee) =>
          employee.contractType === type && employee.status === "activo",
      ).length,
    }))
    .filter((item) => item.value > 0);

  const monthly = lastPeriods(6).map((item) => {
    const rows = companyPayrolls.filter((payroll) => payroll.period === item);
    const totals = rows.reduce(
      (acc, payroll) => {
        const result = payrollTotals(payroll.lines);
        return {
          gross: acc.gross + result.gross,
          deductions: acc.deductions + result.deductions,
          net: acc.net + result.net,
          cost: acc.cost + result.totalCost,
          retention:
            acc.retention +
            payroll.lines
              .filter((line) => line.label === "Retención en la fuente")
              .reduce((sum, line) => sum + line.amount, 0),
        };
      },
      { gross: 0, deductions: 0, net: 0, cost: 0, retention: 0 },
    );
    return { period: item, employees: rows.length, ...totals };
  });

  const yearCost = monthly.reduce((sum, item) => sum + item.cost, 0);
  const activeEmployeesForAverage = companyEmployees.filter(
    (employee) => employee.status === "activo",
  );
  const avgSalary =
    activeEmployeesForAverage.reduce(
      (sum, employee) =>
        sum +
        (currentCompany
          ? monthlyCompensation(employee, currentCompany)
          : employee.salary),
      0,
    ) / Math.max(1, activeEmployeesForAverage.length);

  const exportCsv = () => {
    const header = [
      "Periodo",
      "Empleados",
      "Devengado",
      "Deducciones",
      "Neto",
      "Retención",
      "Coste total",
    ];
    const rows = monthly.map((item) => [
      item.period,
      item.employees,
      item.gross,
      item.deductions,
      item.net,
      item.retention,
      item.cost,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `informe-nomina-${currentCompany?.name ?? "empresa"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const retention = periodPayrolls.reduce(
    (sum, payroll) =>
      sum +
      payroll.lines
        .filter((line) => line.label === "Retención en la fuente")
        .reduce((total, line) => total + line.amount, 0),
    0,
  );
  const employerContributions = periodPayrolls.reduce(
    (sum, payroll) =>
      sum +
      payroll.lines
        .filter((line) => line.group === "aportes")
        .reduce((total, line) => total + line.amount, 0),
    0,
  );

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        eyebrow={currentCompany?.name}
        title="Informes"
        description={`Coste por punto de venta, distribución de la plantilla y retenciones. Últimos ${monthly.length} periodos.`}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Coste acumulado
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            {formatCOP(yearCost)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {monthly.length} periodos liquidados
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Pago mensual promedio
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            {formatCOP(avgSalary)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Salario base + auxilio de transporte
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Retención del periodo
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            {formatCOP(retention)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Estimada art. 383 ET
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Aportes del empleador
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            {formatCOP(employerContributions)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Sin provisiones prestacionales
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="surface-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-display text-base font-semibold">
              Coste por punto de venta
            </CardTitle>
            <span className="text-[11px] text-muted-foreground capitalize">
              {formatMonth(period)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={posData} margin={{ left: -10, right: 8, top: 12 }}>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(value: number) =>
                      `${Math.round(value / 1_000_000)}M`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatCOP(value), "Coste"]}
                  />
                  <Bar
                    dataKey="cost"
                    fill="hsl(var(--chart-1))"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={54}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-0">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
              <PieIcon className="size-4 text-primary" /> Tipo de contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {contractData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={chartColors[index % chartColors.length]}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-2">
              {contractData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background: chartColors[index % chartColors.length],
                      }}
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <TrendingUp className="size-4 text-primary" /> Histórico mensual
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Cifras en COP
          </span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Recibos</TableHead>
                  <TableHead className="text-right">Devengado</TableHead>
                  <TableHead className="text-right">Deducciones</TableHead>
                  <TableHead className="text-right">Retención</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Coste total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.map((item) => (
                  <TableRow key={item.period}>
                    <TableCell className="text-sm font-medium capitalize">
                      {formatMonth(item.period)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatNumber(item.employees)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCOP(item.gross)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-destructive">
                      {formatCOP(item.deductions)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCOP(item.retention)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {formatCOP(item.net)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {formatCOP(item.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {formatMonthShort(period)} muestra {periodPayrolls.length} recibos ·{" "}
            {companyEmployees.filter((e) => e.status === "activo").length}{" "}
            colaboradores activos ·{" "}
            {currentCompany?.pointsOfSale.length} puntos de venta. Retenciones y
            aportes son estimaciones de gestión interna.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
