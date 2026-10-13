import { Upload } from "lucide-react";
import { Link } from "react-router-dom";

/** Opens the spreadsheet import page of a listing, next to its export action. */
export function ImportLink({ to }: { to: string }) {
  return (
    <Link className="excel-export-button import-link" to={to}>
      <Upload aria-hidden="true" />
      Importar
    </Link>
  );
}
