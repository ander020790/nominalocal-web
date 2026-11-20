import { describe, expect, it } from "vitest";
import { fortnightCalendarRange } from "../payroll-periods";

describe("Rangos calendario de nómina", () => {
  it("calcula correctamente la primera quincena", () => {
    expect(fortnightCalendarRange("2026-02", 1)).toEqual({
      start: "2026-02-01",
      end: "2026-02-15",
    });
  });

  it("calcula febrero de 2026 con 28 días", () => {
    expect(fortnightCalendarRange("2026-02", 2)).toEqual({
      start: "2026-02-16",
      end: "2026-02-28",
    });
  });

  it("calcula febrero de 2028 con 29 días", () => {
    expect(fortnightCalendarRange("2028-02", 2)).toEqual({
      start: "2028-02-16",
      end: "2028-02-29",
    });
  });

  it("calcula abril con 30 días", () => {
    expect(fortnightCalendarRange("2026-04", 2)).toEqual({
      start: "2026-04-16",
      end: "2026-04-30",
    });
  });

  it("calcula enero con 31 días", () => {
    expect(fortnightCalendarRange("2026-01", 2)).toEqual({
      start: "2026-01-16",
      end: "2026-01-31",
    });
  });
});
