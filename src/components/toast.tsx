"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, MessageSquare, X, XCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "loading" | "info";
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastApi = {
  /**
   * Shows a toast and returns its id. Loading toasts and any toast shown with
   * `persist` don't auto-dismiss — call `dismiss` yourself once the work
   * finishes or the viewer has acted on it.
   */
  show: (message: string, variant?: ToastVariant, options?: { persist?: boolean }) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const DISMISS_AFTER_MS = 5000;

let nextId = 0;

/**
 * Global toast host. Mounted once at the root layout so any client
 * component can call `useToast()` instead of rendering its own inline
 * success/error/loading state.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, variant = "success", options) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, variant }]);
      // A loading toast represents ongoing work with no fixed duration — it
      // stays until the caller dismisses it (or shows a fresh success/error).
      if (variant !== "loading" && !options?.persist) window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="pointer-events-none fixed right-6 top-6 z-50 flex flex-col items-end gap-3">
        {toasts.map((toast) => {
          const badge = badgeStyles[toast.variant];
          return (
            <div
              key={toast.id}
              role={toast.variant === "error" ? "alert" : "status"}
              className="animate-toast-in pointer-events-auto flex w-80 items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-line"
            >
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${badge.className}`}>
                <badge.Icon className={`size-5 ${toast.variant === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
              </span>
              <p className="flex-1 pt-1 text-sm font-medium text-ink">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss"
                className="shrink-0 text-ink-soft transition-colors hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

const badgeStyles: Record<ToastVariant, { Icon: typeof CheckCircle2; className: string }> = {
  success: { Icon: CheckCircle2, className: "bg-success-soft text-success" },
  error: { Icon: XCircle, className: "bg-accent-soft text-accent" },
  loading: { Icon: Loader2, className: "bg-surface-muted text-ink-soft" },
  info: { Icon: MessageSquare, className: "bg-surface-muted text-ink" },
};

/** Shows a transient confirmation, error, or loading toast from a client component. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used within a ToastProvider");
  return api;
}
