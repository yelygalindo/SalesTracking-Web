import { describe, expect, it } from "vitest";
import {
  normalizeImportRows,
  normalizeOptionalSellerExternalId,
} from "./normalizeImportRows";

describe("normalizeImportRows", () => {
  it.each([undefined, null, "", "   ", "user-vendedor", "Vendedor-Ejemplo"])(
    "convierte %s en un vendedor no asignado",
    (value) => {
      expect(normalizeOptionalSellerExternalId(value)).toBeNull();
    },
  );

  it("conserva solamente el externalId limpio cuando fue proporcionado", () => {
    expect(
      normalizeImportRows([
        { rowNumber: 2, sellerExternalId: "  usr_01HSELLER  " },
      ]),
    ).toEqual([{ rowNumber: 2, sellerExternalId: "usr_01HSELLER" }]);
  });
});
