import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import clsx from "clsx";
import { ToastContext } from "./useToast";
import type { ToastInput } from "./useToast";

type Toast = ToastInput & { id: number };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { ...input, id }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-20 z-[100] grid justify-items-center gap-2" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.tone === "error" ? XCircle : toast.tone === "info" ? Info : CheckCircle2;
          return (
            <div key={toast.id} className={clsx(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-surface px-4 py-3 text-sm font-semibold shadow-float",
              toast.tone === "error" ? "border-clay/30 text-clay" : "border-line text-ink",
            )}>
              <Icon size={19} className={toast.tone === "error" ? "text-clay" : "text-meadow"} />
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="grid h-8 w-8 place-items-center rounded-xl text-ink/45 hover:bg-soft" aria-label="Закрыть уведомление">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
