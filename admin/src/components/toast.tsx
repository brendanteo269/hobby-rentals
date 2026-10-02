"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "loading";
type Toast = { id: number; message: string; variant: ToastVariant };
type ToastApi = { show: (message: string, variant?: ToastVariant) => number; dismiss: (id: number) => void };

const ToastContext = createContext<ToastApi | null>(null);
const DISMISS_AFTER_MS = 5000;
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const show = useCallback<ToastApi["show"]>((message, variant = "success") => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, variant }]);
    if (variant !== "loading") window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    return id;
  }, [dismiss]);
  return <ToastContext.Provider value={{ show, dismiss }}>
    {children}
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex w-80 flex-col gap-3">
      {toasts.map((toast) => <div key={toast.id} role={toast.variant === "error" ? "alert" : "status"} className={toast.variant === "error" ? "pointer-events-auto flex items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line" : "pointer-events-auto flex items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line"}><span className={toast.variant === "error" ? "mt-1 size-2 shrink-0 rounded-full bg-bad" : toast.variant === "loading" ? "mt-1 size-2 shrink-0 rounded-full bg-ink-soft" : "mt-1 size-2 shrink-0 rounded-full bg-ok"} /><p className="flex-1 text-sm font-medium text-ink">{toast.message}</p><button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="text-ink-soft hover:text-ink">×</button></div>)}
    </div>
  </ToastContext.Provider>;
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used within a ToastProvider");
  return api;
}
