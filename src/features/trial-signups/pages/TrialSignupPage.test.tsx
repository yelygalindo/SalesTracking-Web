import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trialSignupApi } from "../api/trialSignupApi";
import { TrialSignupPage } from "./TrialSignupPage";

vi.mock("../api/trialSignupApi", () => ({ trialSignupApi: { create: vi.fn() } }));
const api = vi.mocked(trialSignupApi);

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TrialSignupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });

describe("TrialSignupPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra los errores en línea y no envía datos incompletos", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Comenzar prueba gratuita" }));
    expect(screen.getByText("Ingresa tu nombre completo.")).toBeInTheDocument();
    expect(screen.getByText("Indica el rubro de tu empresa.")).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it("envía el registro sin captcha cuando no hay site key y pide revisar el correo", async () => {
    api.create.mockResolvedValue({
      email: "ana@empresa.com",
      verificationExpiresAtUtc: "2026-10-13T12:00:00Z",
      emailStatus: "Sent",
      message: "Te enviamos un correo para activar tu prueba.",
    });
    renderPage();
    fill("Nombre completo", "Ana Pérez");
    fill("Correo de trabajo", "ana@empresa.com");
    fill("Teléfono", "+591 70000000");
    fill("Empresa", "Constructora Andina");
    fill("Rubro", "Construcción");
    fill("Ciudad", "La Paz");
    fill("País", "Bolivia");
    fireEvent.click(screen.getByRole("button", { name: "Comenzar prueba gratuita" }));

    expect(await screen.findByRole("heading", { name: "Revisa tu correo" })).toBeInTheDocument();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ industry: "Construcción", captchaToken: "" }),
    );
  });
});
