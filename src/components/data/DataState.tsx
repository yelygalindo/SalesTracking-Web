import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCw, WifiOff } from "lucide-react";
import { Skeleton, type SkeletonVariant } from "@/components/feedback/Skeleton";
import { AppError } from "@/lib/api/apiError";
import { describeError } from "@/lib/api/errorMessage";

export function DataState({
  loading,
  error,
  empty,
  emptyTitle = "Sin resultados",
  emptyAction,
  isEmpty,
  onRetry,
  skeleton = "list",
  children,
}: {
  loading: boolean;
  error?: Error | null;
  empty: string;
  emptyTitle?: string;
  emptyAction?: ReactNode;
  isEmpty: boolean;
  onRetry?: () => unknown;
  skeleton?: SkeletonVariant;
  children: ReactNode;
}) {
  if (loading) return <Skeleton variant={skeleton} rows={skeleton === "table" ? 6 : 4} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isEmpty)
    return (
      <EmptyState title={emptyTitle} description={empty} action={emptyAction} />
    );
  return <>{children}</>;
}

export function EmptyState({
  title,
  description,
  action,
  icon = <Inbox />,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="data-state empty-state">
      <span className="data-state-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => unknown;
}) {
  const { title, message, retryable } = describeError(error);
  const offline = error instanceof AppError && error.code === "network";
  return (
    <div className="data-state error" role="alert">
      <span className="data-state-icon" aria-hidden="true">
        {offline ? <WifiOff /> : <AlertTriangle />}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry && retryable && (
        <button className="secondary-button" type="button" onClick={() => void onRetry()}>
          <RotateCw aria-hidden="true" /> Reintentar
        </button>
      )}
    </div>
  );
}
