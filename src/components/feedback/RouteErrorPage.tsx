import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export function RouteErrorPage() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="status-page">
      <p className="overline">Algo salió mal</p>
      <h1>{isNotFound ? "Página no encontrada" : "No pudimos cargar esta pantalla"}</h1>
      <p>
        {isNotFound
          ? "La dirección solicitada no existe."
          : "Actualiza la página para intentarlo nuevamente. Si el problema continúa, comunícate con soporte."}
      </p>
      <div className="status-actions">
        <button
          className="primary-link button-link"
          onClick={() => window.location.reload()}
        >
          Actualizar página
        </button>
        <Link className="back-link" to="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
