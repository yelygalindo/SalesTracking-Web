import { describe, expect, it } from "vitest";
import {
  buildSupportMail,
  maxMessageLength,
  supportMailHref,
  supportMailText,
} from "./supportMail";

const context = {
  userName: "Ana Gutiérrez",
  userEmail: "ana@empresa.com",
  company: "Constructora Andina",
  roles: ["Administrador"],
  page: "/customers",
  browser: "Chrome",
  sentAt: "12/10/2026 10:30",
};

describe("buildSupportMail", () => {
  it("antepone la categoría al asunto e incluye los datos técnicos", () => {
    const mail = buildSupportMail({
      category: "technical",
      subject: " No carga el mapa ",
      message: "El mapa queda en blanco.",
      context,
    });
    expect(mail.subject).toBe("[UrbanTrack · Problema técnico] No carga el mapa");
    expect(mail.body).toContain("El mapa queda en blanco.");
    expect(mail.body).toContain("Usuario: Ana Gutiérrez (ana@empresa.com)");
    expect(mail.body).toContain("Página: /customers");
  });

  it("omite los datos técnicos cuando el usuario no quiere enviarlos", () => {
    const mail = buildSupportMail({ category: "usage", subject: "Hola", message: "¿Cómo exporto?" });
    expect(mail.body).toBe("¿Cómo exporto?");
  });

  it("recorta mensajes demasiado largos para el enlace de correo", () => {
    const mail = buildSupportMail({ category: "usage", subject: "x", message: "a".repeat(5000) });
    expect(mail.body).toHaveLength(maxMessageLength);
  });
});

describe("supportMailHref", () => {
  it("codifica asunto y cuerpo usando %20 para los espacios", () => {
    const href = supportMailHref("soporte@urbantrack.com", { subject: "Hola equipo", body: "Línea 1\nLínea 2" });
    expect(href).toBe(
      "mailto:soporte@urbantrack.com?subject=Hola%20equipo&body=L%C3%ADnea%201%0AL%C3%ADnea%202",
    );
  });

  it("arma un texto listo para pegar en un correo web", () => {
    expect(supportMailText("s@u.com", { subject: "A", body: "B" })).toBe("Para: s@u.com\nAsunto: A\n\nB");
  });
});

describe("describeBrowser", () => {
  it("resume navegadores y sistemas comunes", async () => {
    const { describeBrowser } = await import("./supportMail");
    expect(describeBrowser("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")).toBe("Chrome 140 en Windows");
    expect(describeBrowser("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0")).toBe("Edge 140 en Windows");
    expect(describeBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari 18 en iOS");
    expect(describeBrowser("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/139.0 Mobile Safari/537.36")).toBe("Chrome 139 en Android");
  });
});
