export type ToastTone = "success" | "error";
export interface ToastAction {
  label: string;
  onAction: () => void;
}
export interface ToastDetail {
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}
export function notify(
  message: string,
  tone: ToastTone = "success",
  action?: ToastAction,
) {
  window.dispatchEvent(
    new CustomEvent<ToastDetail>("urbantrack:toast", {
      detail: { message, tone, action },
    }),
  );
}
