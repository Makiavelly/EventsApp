import { createContext, useContext } from "react";

export type ToastTone = "success" | "error" | "info";
export type ToastInput = { message: string; tone?: ToastTone };

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
