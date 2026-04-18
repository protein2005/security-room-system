import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RadioTower } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { useToast } from "@/shared/feedback/toast-provider";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { login, isAuthenticating } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const nextPath = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      await login(form);
      toast.success("Вхід виконано", "Ти успішно увійшов у систему.");
      navigate(nextPath, { replace: true });
    } catch (error) {
      toast.error(
        "Не вдалося увійти",
        error?.response?.data?.message || "Перевір email і пароль та спробуй ще раз."
      );
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-panel">
                <RadioTower className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-foreground">Security Room System</span>
              </div>
              <h1 className="text-5xl font-semibold leading-tight text-slate-950">
                Єдиний центр контролю для кімнат, подій і пристроїв.
              </h1>
              <p className="max-w-lg text-base text-slate-600">
                Увійди в систему, щоб керувати прив'язаними ESP32, переглядати стан кімнат у реальному часі та
                реагувати на тривоги без перемикань між інструментами.
              </p>
            </div>
          </div>

          <Card className="mx-auto w-full max-w-lg">
            <CardHeader className="space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-panel">
                <RadioTower className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Авторизація</p>
                <CardTitle className="mt-2 text-3xl">Вхід до панелі керування</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="admin@security-room.local"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none ring-0 focus:border-primary"
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Пароль</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Введи пароль"
                    className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none ring-0 focus:border-primary"
                    autoComplete="current-password"
                    required
                  />
                </label>

                <Button type="submit" className="w-full" disabled={isAuthenticating}>
                  {isAuthenticating ? "Вхід..." : "Увійти"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
