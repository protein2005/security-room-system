import {
  Bell,
  Cpu,
  DoorOpen,
  LayoutDashboard,
  Menu,
  RadioTower,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";

const navigation = [
  { to: "/dashboard", label: "Панель", icon: LayoutDashboard },
  { to: "/rooms", label: "Кімнати", icon: DoorOpen },
  { to: "/devices", label: "Пристрої", icon: Cpu },
  { to: "/provisioning", label: "Прив'язка", icon: SlidersHorizontal },
  { to: "/alarms", label: "Тривоги", icon: ShieldAlert },
  { to: "/events", label: "Події", icon: Bell },
];

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-panel">
            <RadioTower className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Security Room</p>
            <h2 className="text-xl font-semibold">Пульт керування</h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Адаптивна панель керування приміщеннями, пристроями, тривогами та live-станом системи.
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive ? "bg-primary text-primary-foreground shadow-panel" : "text-foreground hover:bg-white/80"
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("uk-UA", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    []
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[320px] shrink-0 border-r border-white/50 bg-white/40 p-6 backdrop-blur xl:block">
          <SidebarContent />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/50 bg-white/65 backdrop-blur">
            <div className="page-shell py-3">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="xl:hidden" onClick={() => setMobileOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Центр керування</p>
                  <p className="text-sm text-muted-foreground">{todayLabel}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button className="absolute inset-0 bg-slate-950/45" aria-label="Закрити меню" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[88vw] max-w-[340px] border-r border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur">
            <div className="mb-5 flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
