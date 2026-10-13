import { describe, expect, it } from "vitest";
import { addSupportFiles, formatFileSize } from "./supportAttachments";

const file = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

describe("addSupportFiles", () => {
  it("acepta imágenes y PDF dentro del límite", () => {
    const result = addSupportFiles([], [
      file("captura.png", "image/png"),
      file("detalle.pdf", "application/pdf"),
    ]);
    expect(result.files.map((item) => item.name)).toEqual([
      "captura.png",
      "detalle.pdf",
    ]);
    expect(result.rejected).toEqual([]);
  });

  it("explica por qué rechaza tipos, tamaños y excesos", () => {
    const current = [file("a.png", "image/png"), file("b.png", "image/png")];
    const result = addSupportFiles(current, [
      file("virus.exe", "application/x-msdownload"),
      file("enorme.jpg", "image/jpeg", 6 * 1024 * 1024),
      file("c.png", "image/png"),
      file("d.png", "image/png"),
    ]);
    expect(result.files.map((item) => item.name)).toEqual(["a.png", "b.png", "c.png"]);
    expect(result.rejected).toEqual([
      "virus.exe: solo se aceptan imágenes (PNG, JPG, WebP) o PDF.",
      "enorme.jpg: supera el máximo de 5 MB.",
      "d.png: puedes adjuntar hasta 3 archivos.",
    ]);
  });

  it("ignora el mismo archivo elegido dos veces", () => {
    const current = [file("a.png", "image/png")];
    expect(addSupportFiles(current, [file("a.png", "image/png")]).files).toHaveLength(1);
  });
});

describe("formatFileSize", () => {
  it("muestra KB o MB", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
