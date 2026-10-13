import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { projectApi } from "./projectApi";

describe("projectApi notas", () => {
  const api = new MockAdapter(apiClient);

  beforeEach(() => {
    api.reset();
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000002",
    );
  });

  it("edita una nota con un identificador de solicitud", async () => {
    api
      .onPut("/api/projects/project-1/notes/note-2")
      .reply(200, { message: "Nota actualizada." });

    await projectApi.updateNote("project-1", "note-2", "Texto nuevo");

    expect(JSON.parse(api.history.put[0].data)).toEqual({
      content: "Texto nuevo",
      clientRequestId: "00000000-0000-4000-8000-000000000002",
    });
  });

  it("elimina una nota por su identificador externo", async () => {
    api
      .onDelete("/api/projects/project-1/notes/note-2")
      .reply(200, { message: "Nota eliminada." });

    await projectApi.deleteNote("project-1", "note-2");

    expect(api.history.delete).toHaveLength(1);
  });
});
