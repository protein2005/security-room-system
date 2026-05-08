import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

const ToastContext = createContext(null);

const iconMap = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const styleMap = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-rose-200 bg-rose-50 text-rose-950",
  info: "border-sky-200 bg-white text-slate-950",
};

function createToastId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return `${Date.now().toString(36)}-${values[0].toString(36)}-${values[1].toString(36)}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    ({ title, description, variant = "info" }) => {
      const id = createToastId();

      setToasts((current) => [...current, { id, title, description, variant }]);
      window.setTimeout(() => dismissToast(id), 3500);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      success: (title, description) => pushToast({ title, description, variant: "success" }),
      error: (title, description) => pushToast({ title, description, variant: "error" }),
      info: (title, description) => pushToast({ title, description, variant: "info" }),
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((toast) => {
            const Icon = iconMap[toast.variant] || Info;

            return (
              <div
                key={toast.id}
                className={cn(
                  "pointer-events-auto rounded-3xl border px-4 py-4 shadow-panel backdrop-blur",
                  styleMap[toast.variant] || styleMap.info
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{toast.title}</p>
                    {toast.description ? <p className="mt-1 text-sm opacity-80">{toast.description}</p> : null}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dismissToast(toast.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
