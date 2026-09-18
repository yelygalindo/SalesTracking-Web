import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/apiClient";
import { customerService } from "./customerService";

const mock = new MockAdapter(apiClient);
const input = {
  name: " Ana ",
  companyName: " ACME ",
  phone: " 700 ",
  email: " a@b.com ",
  sellerExternalId: "",
  address: " Centro ",
  latitude: null,
  longitude: null,
};

describe("customerService", () => {
  beforeEach(() => {
    mock.reset();
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
  });
  it("envía filtros al listar clientes", async () => {
    mock.onGet("/api/customers").reply(200, {
      customers: [],
      page: 2,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
    });
    await customerService.list({
      search: "ana",
      status: "active",
      page: 2,
      pageSize: 20,
    });
    expect(mock.history.get[0].params).toEqual({
      search: "ana",
      status: "active",
      page: 2,
      pageSize: 20,
    });
  });
  it("normaliza y agrega idempotencia al crear", async () => {
    mock
      .onPost("/api/customers")
      .reply(201, { id: "cust-1", message: "Creado" });
    await customerService.create(input);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      name: "Ana",
      companyName: "ACME",
      phone: "700",
      email: "a@b.com",
      sellerExternalId: null,
      address: "Centro",
      latitude: null,
      longitude: null,
      clientRequestId: "00000000-0000-4000-8000-000000000001",
    });
  });
  it("envía las filas y la selección de una importación validada", async () => {
    mock.onPost("/api/customers/imports/validate").reply(200, {
      importId: "import-1",
      totalRows: 1,
      validRows: 1,
      warningRows: 0,
      invalidRows: 0,
      rows: [],
    });
    mock
      .onPost("/api/customers/imports/import-1/commit")
      .reply(200, { created: 1, failed: 0, items: [] });
    await customerService.validateImport([{ rowNumber: 2, name: "Ana" }]);
    await customerService.commitImport("import-1", {
      includeAllValidRows: false,
      includeWarningRows: false,
      selectedRows: [2],
    });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      rows: [{ rowNumber: 2, name: "Ana" }],
    });
    expect(JSON.parse(mock.history.post[1].data).selectedRows).toEqual([2]);
  });
});
