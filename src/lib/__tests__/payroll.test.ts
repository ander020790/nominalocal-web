import { describe, expect, it } from "vitest";
import { calculatePayroll } from "../payroll";
import { BASE_PARAMS } from "../../data/defaults";
import type { Company, Employee } from "../../data/types";

describe("Nómina colombiana - base de cotización", () => {
  it("excluye del IBC un auxilio de alimentación no cotizable", () => {
    const company = {
      params: BASE_PARAMS,
    } as Company;

    const employee = {
      salary: 3_000_000,
      integralSalary: false,
      transportAllowance: false,
      motoAllowance: false,
      fixedEarnings: [],
      fixedDeductions: [],
      riskLevel: "I",
      eps: "EPS de prueba",
      pensionFund: "Fondo de prueba",
    } as Employee;

    const result = calculatePayroll(
      employee,
      company,
      [{
        label: "Auxilio de alimentación",
        amount: 200_000,
        cotizable: false,
        prestacional: false,
        taxable: false,
      }],
      30,
    );

    expect(result.ibc).toBe(3_000_000);
  });

  it("incluye ingresos fijos salariales en el IBC", () => {
    const company = { params: BASE_PARAMS } as Company;

    const employee = {
      salary: 3_000_000,
      integralSalary: false,
      transportAllowance: false,
      fixedEarnings: [
        { label: "Comisión fija salarial", amount: 200_000 },
      ],
      fixedDeductions: [],
      riskLevel: "I",
      eps: "EPS de prueba",
      pensionFund: "Fondo de prueba",
    } as Employee;

    const result = calculatePayroll(employee, company, [], 30);

    expect(result.ibc).toBe(3_200_000);
  });

});


describe("Descuentos fijos por quincena", () => {
  const calculate = (
    schedule: "first" | "second" | "both" | undefined,
    fortnight: 1 | 2,
    amount = 200_000,
  ) => {
    const company = { params: BASE_PARAMS } as Company;

    const employee = {
      salary: 3_000_000,
      integralSalary: false,
      transportAllowance: false,
      motoAllowance: false,
      fixedEarnings: [],
      fixedDeductions: [
        { label: "Libranza de prueba", amount, schedule },
      ],
      riskLevel: "I",
      eps: "EPS de prueba",
      pensionFund: "Fondo de prueba",
    } as Employee;

    const result = calculatePayroll(
      employee,
      company,
      [],
      15,
      fortnight,
    );

    return result.lines
      .filter((line) => line.label === "Libranza de prueba")
      .reduce((sum, line) => sum + line.amount, 0);
  };

  it("cobra todo en la primera quincena", () => {
    expect(calculate("first", 1)).toBe(200_000);
    expect(calculate("first", 2)).toBe(0);
  });

  it("cobra todo en la segunda quincena", () => {
    expect(calculate("second", 1)).toBe(0);
    expect(calculate("second", 2)).toBe(200_000);
  });

  it("divide el valor entre ambas quincenas", () => {
    expect(calculate("both", 1)).toBe(100_000);
    expect(calculate("both", 2)).toBe(100_000);
  });

  it("conserva el total mensual con valores impares", () => {
    const first = calculate("both", 1, 200_001);
    const second = calculate("both", 2, 200_001);

    expect(first + second).toBe(200_001);
  });

  it("mantiene el comportamiento anterior sin programación", () => {
    expect(calculate(undefined, 1)).toBe(200_000);
    expect(calculate(undefined, 2)).toBe(200_000);
  });
});
