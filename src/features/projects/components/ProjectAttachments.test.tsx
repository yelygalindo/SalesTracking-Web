import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectAttachments } from "./ProjectAttachments";
import { projectService } from "../services/projectService";

vi.mock("../services/projectService", () => ({
  projectService: {
    attachments: vi.fn(),
    attachmentOptions: vi.fn(),
    visits: vi.fn(),
    upload: vi.fn(),
    deleteAttachment: vi.fn(),
    setCover: vi.fn(),
    downloadAttachmentsArchive: vi.fn(),
  },
}));

const service = vi.mocked(projectService);

const renderComponent = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ProjectAttachments id="p1" editable canDelete={false} />
    </QueryClientProvider>,
  );

describe("ProjectAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.attachmentOptions.mockResolvedValue({
      maxFileSizeBytes: 10 * 1024 * 1024,
      attachmentTypes: [
        { value: "Photo", label: "Fotografía", description: "" },
        { value: "Document", label: "Documento", description: "" },
      ],
      acceptedFormats: [
        { description: "JPEG", extensions: [".jpg"], contentTypes: ["image/jpeg"] },
        { description: "PDF", extensions: [".pdf"], contentTypes: ["application/pdf"] },
      ],
    });
    service.visits.mockResolvedValue([
      { externalId: "v1", visitedAtUtc: "2026-10-12T15:00:00Z", sellerName: "María" },
    ] as never);
    service.attachments.mockResolvedValue([
      {
        id: 1,
        externalId: "a1",
        fileName: "plano.pdf",
        contentType: "application/pdf",
        sizeBytes: 2048,
        attachmentType: "Document",
        caption: null,
        isCover: false,
        downloadUrl: "https://files/plano.pdf",
        uploadedByUserName: "Ana",
        createdAtUtc: "2026-10-12T15:00:00Z",
        visitExternalId: "v1",
      },
    ]);
    service.upload.mockResolvedValue({});
  });

  it("muestra los documentos con su formato y la visita asociada", async () => {
    renderComponent();
    expect(await screen.findByText("plano.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(await screen.findByText(/Visita del .* · María/)).toBeInTheDocument();
  });

  it("sube un PDF al proyecto sin exigir visita y lo clasifica como documento", async () => {
    renderComponent();
    fireEvent.click(await screen.findByRole("button", { name: /Subir archivo/ }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["%PDF"], "acta.pdf", { type: "application/pdf" })] } });
    expect(await screen.findByText(/Se guardará como/)).toHaveTextContent("Documento del proyecto");
    expect(screen.getAllByRole("button", { name: /Subir archivo/ }).at(-1)).toBeEnabled();
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(service.upload).toHaveBeenCalled());
    expect(service.upload.mock.calls[0][1]).toMatchObject({
      attachmentType: "Document",
      visitExternalId: undefined,
      contentType: "application/pdf",
      isCover: false,
    });
  });
});
