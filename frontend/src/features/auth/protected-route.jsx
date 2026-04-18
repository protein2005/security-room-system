import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./auth-provider";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass-panel w-full max-w-md p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Security Room</p>
          <h1 className="mt-3 text-2xl font-semibold">Перевірка сесії</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Зачекай кілька секунд, система відновлює авторизацію.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
