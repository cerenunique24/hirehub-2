"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastTone = "success" | "warning" | "error" | "info";

type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "text-[var(--color-success-600)]",
  warning: "text-[var(--color-warning-600)]",
  error: "text-[var(--color-error-600)]",
  info: "text-[var(--color-info-600)]",
};

const ToastContext = createContext<((tone: ToastTone, message: string) => void) | null>(null);

/** CollaCrew Design System — Toast provider + hook, shared by both panels. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-2.5 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-4 py-3 shadow-lg"
            >
              <Icon size={18} strokeWidth={1.8} className={["mt-0.5 shrink-0", TONE_CLASSES[toast.tone]].join(" ")} />
              <p className="cc-body text-[var(--color-text-primary)]">{toast.message}</p>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="ml-1 shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                aria-label="Kapat"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used within a ToastProvider");

  return {
    success: (message: string) => push("success", message),
    warning: (message: string) => push("warning", message),
    error: (message: string) => push("error", message),
    info: (message: string) => push("info", message),
  };
}
