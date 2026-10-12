import { AppError, type AppErrorCode } from "@/lib/api/apiError";

export interface ErrorDescription {
  title: string;
  message: string;
  retryable: boolean;
}

const fallbackMessage = "Algo salió mal. Inténtalo nuevamente en unos segundos.";

const descriptions: Partial<Record<AppErrorCode, Omit<ErrorDescription, "message"> & { message?: string }>> = {
  network: {
    title: "Sin conexión con UrbanTrack",
    message: "Revisa tu conexión a internet e inténtalo nuevamente.",
    retryable: true,
  },
  server: {
    title: "El servicio no responde",
    message: "UrbanTrack no está disponible temporalmente. Inténtalo en unos minutos.",
    retryable: true,
  },
  rateLimited: { title: "Demasiadas solicitudes", retryable: true },
  trialExpired: { title: "Tu prueba gratuita terminó", retryable: false },
  forbidden: { title: "No tienes acceso a esta información", retryable: false },
  unauthorized: {
    title: "Tu sesión expiró",
    message: "Vuelve a iniciar sesión para continuar.",
    retryable: false,
  },
  notFound: { title: "No encontramos lo que buscas", retryable: false },
  conflict: { title: "La información cambió", retryable: true },
  validation: { title: "Revisa los datos ingresados", retryable: false },
};

/** Turns any thrown value into a title and a message users can act on. */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof AppError) {
    const known = descriptions[error.code];
    return {
      title: known?.title ?? "No pudimos cargar la información",
      message: known?.message ?? (error.message || fallbackMessage),
      retryable: known?.retryable ?? error.retryable,
    };
  }
  return {
    title: "No pudimos cargar la información",
    message: userFacingMessage(error) ?? fallbackMessage,
    retryable: true,
  };
}

/** Single-line message for toasts and inline form errors. */
export function errorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message || describeError(error).message;
  return userFacingMessage(error) ?? fallbackMessage;
}

// Plain Errors carry messages written for users; runtime errors (TypeError, …) do not.
const userFacingMessage = (error: unknown) =>
  error instanceof Error && error.name === "Error" && error.message ? error.message : undefined;
