import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useUrlFilters } from "./useUrlFilters";

const setup = (initial: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => ({ filters: useUrlFilters(["q", "status"] as const), location: useLocation() }),
    { wrapper },
  );
};

describe("useUrlFilters", () => {
  it("lee los filtros y la página desde la URL", () => {
    const { result } = setup("/customers?q=sol&page=3");
    expect(result.current.filters.values).toEqual({ q: "sol", status: "" });
    expect(result.current.filters.page).toBe(3);
  });

  it("vuelve a la primera página al cambiar un filtro", () => {
    const { result } = setup("/customers?q=sol&page=3");
    act(() => result.current.filters.update({ status: "active" }));
    expect(result.current.location.search).toBe("?q=sol&status=active");
  });

  it("elimina parámetros vacíos y conserva otros", () => {
    const { result } = setup("/customers?selected=c1&q=sol");
    act(() => result.current.filters.update({ q: "" }));
    expect(result.current.location.search).toBe("?selected=c1");
    act(() => result.current.filters.setPage(2));
    expect(result.current.location.search).toBe("?selected=c1&page=2");
  });
});
