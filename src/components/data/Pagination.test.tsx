import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("navega y bloquea los límites", () => {
    const onChange = vi.fn();
    render(
      <Pagination
        page={1}
        totalPages={3}
        totalItems={45}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("muestra el rango y la página activa", () => {
    render(
      <Pagination
        page={2}
        pageSize={20}
        totalPages={7}
        totalItems={125}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Mostrando 21–40 de 125 registros"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
