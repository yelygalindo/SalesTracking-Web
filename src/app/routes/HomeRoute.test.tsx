import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  AuthContext,
  type AuthContextValue,
} from "@/features/auth/context/authContext";
import { HomeRoute } from "./HomeRoute";

const platformAdminContext: AuthContextValue = {
  status: "authenticated",
  user: {
    id: 1,
    externalId: "user-1",
    username: "platform",
    fullName: "Administración de plataforma",
    email: "platform@example.com",
    company: { id: 1, externalId: "company-1", name: "Plataforma" },
    roles: ["platform_admin"],
    permissions: [],
  },
  sessionExpired: false,
  login: vi.fn(),
  logout: vi.fn(),
};

describe("HomeRoute", () => {
  it("envía al administrador de plataforma a Administración", () => {
    render(
      <AuthContext.Provider value={platformAdminContext}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/admin/companies" element={<p>Empresas</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Empresas")).toBeInTheDocument();
  });
});
