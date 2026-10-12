import { describe, expect, it } from "vitest";
import { formatBytes, validateAttachment } from "./attachmentValidation";
import type { AttachmentOptions } from "../api/projectDtos";

const options: AttachmentOptions = {
  maxFileSizeBytes: 1024,
  attachmentTypes: [
    { value: "Photo", label: "Fotografía", description: "Imagen" },
  ],
  acceptedFormats: [
    {
      description: "JPEG",
      extensions: [".jpg", ".jpeg"],
      contentTypes: ["image/jpeg"],
    },
  ],
};

describe("validateAttachment", () => {
  it("acepta archivos que cumplen tamaño, extensión y MIME", () => {
    expect(
      validateAttachment(
        new File(["foto"], "obra.jpg", { type: "image/jpeg" }),
        options,
      ),
    ).toBeNull();
  });

  it("rechaza extensiones no permitidas", () => {
    expect(
      validateAttachment(
        new File(["pdf"], "obra.pdf", { type: "application/pdf" }),
        options,
      ),
    ).toContain("Formato no permitido");
  });

  it("rechaza contenido que no coincide con la extensión", () => {
    expect(
      validateAttachment(
        new File(["foto"], "obra.jpg", { type: "image/png" }),
        options,
      ),
    ).toContain("no coincide");
  });

  it("rechaza archivos que superan el máximo", () => {
    expect(
      validateAttachment(
        new File([new Uint8Array(1025)], "obra.jpg", { type: "image/jpeg" }),
        options,
      ),
    ).toContain("supera el máximo");
  });
});

describe("formatBytes", () => {
  it("presenta tamaños legibles", () => {
    expect(formatBytes(10 * 1024 * 1024)).toBe("10.0 MB");
  });
});

describe("adjuntos de documentos", async () => {
  const {
    attachmentKindFor,
    contentTypeFor,
    documentFormat,
    isPhoto,
  } = await import("./attachmentValidation");
  const full: AttachmentOptions = {
    maxFileSizeBytes: 10 * 1024 * 1024,
    attachmentTypes: [
      { value: "Photo", label: "Fotografía", description: "" },
      { value: "Document", label: "Documento", description: "" },
    ],
    acceptedFormats: [
      { description: "JPEG", extensions: [".jpg", ".jpeg"], contentTypes: ["image/jpeg"] },
      { description: "PDF", extensions: [".pdf"], contentTypes: ["application/pdf"] },
      {
        description: "Excel",
        extensions: [".xlsx", ".xls"],
        contentTypes: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
      },
      { description: "Word", extensions: [".doc"], contentTypes: ["application/msword"] },
    ],
  };

  it("deduce fotografía o documento según la extensión", () => {
    expect(attachmentKindFor("obra.JPG", full)).toBe("Photo");
    expect(attachmentKindFor("contrato.pdf", full)).toBe("Document");
    expect(attachmentKindFor("planilla.xlsx", full)).toBe("Document");
    expect(attachmentKindFor("virus.exe", full)).toBeNull();
  });

  it("acepta documentos sin MIME y envía el tipo esperado", () => {
    const file = new File(["x"], "acta.doc", { type: "" });
    expect(validateAttachment(file, full)).toBeNull();
    expect(contentTypeFor(file, full)).toBe("application/msword");
    const xls = new File(["x"], "costos.xls", { type: "application/vnd.ms-excel" });
    expect(contentTypeFor(xls, full)).toBe("application/vnd.ms-excel");
  });

  it("clasifica y nombra los adjuntos existentes", () => {
    expect(isPhoto({ attachmentType: "Photo", contentType: "image/png" })).toBe(true);
    expect(isPhoto({ attachmentType: "Document", contentType: "application/pdf" })).toBe(false);
    expect(isPhoto({ attachmentType: "", contentType: "image/png" })).toBe(true);
    expect(documentFormat({ fileName: "costos.xlsx", contentType: "" })).toBe("Excel");
    expect(documentFormat({ fileName: "acta.docx", contentType: "" })).toBe("Word");
    expect(documentFormat({ fileName: "plano.pdf", contentType: "application/pdf" })).toBe("PDF");
  });
});
