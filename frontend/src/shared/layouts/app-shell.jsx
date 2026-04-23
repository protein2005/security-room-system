import {
  Bell,
  Command,
  Cpu,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  RadioTower,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { fetchRooms } from "@/shared/api/rooms";
import { cn, formatAlarmReason } from "@/shared/lib/utils";
import { useQuery } from "@tanstack/react-query";

const navigation = [
  { to: "/dashboard", label: "Панель", icon: LayoutDashboard },
  { to: "/rooms", label: "Кімнати", icon: DoorOpen },
  { to: "/devices", label: "Пристрої", icon: Cpu },
  { to: "/provisioning", label: "Прив'язка", icon: SlidersHorizontal },
  { to: "/alarms", label: "Тривоги", icon: ShieldAlert },
  { to: "/events", label: "Події", icon: Bell },
  { to: "/commands", label: "Команди", icon: Command },
];

function SidebarContent({ onNavigate, user, onLogout }) {
  return (
    <div className="flex h-full flex-col gap-6">
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

      <div className="mt-auto rounded-3xl border border-white/70 bg-white/80 p-4">
        <p className="text-sm font-semibold">{user?.name || "Користувач"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email} • {user?.role || "viewer"}
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Вийти
        </Button>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alarmsOpen, setAlarmsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const alarmsPanelRef = useRef(null);
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
    staleTime: 60_000,
  });
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("uk-UA", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    []
  );
  const activeAlarms = useMemo(
    () =>
      (roomsQuery.data || [])
        .filter((room) => room?.alarmActive)
        .map((room) => ({
          _id: room._id || room.roomId,
          roomId: room.roomId,
          roomName: room.roomName || room.roomId,
          reason: room.alarmReason,
        })),
    [roomsQuery.data]
  );
  const activeAlarmsCount = activeAlarms.length;
  const hasActiveAlarms = activeAlarmsCount > 0;

  useEffect(() => {
    function handlePointerDown(event) {
      if (alarmsPanelRef.current && !alarmsPanelRef.current.contains(event.target)) {
        setAlarmsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAlarmsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    logout();
    setMobileOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="mx-auto flex h-screen max-w-[1600px] overflow-hidden">
        <aside className="hidden h-screen w-[320px] shrink-0 border-r border-white/50 bg-white/40 p-6 backdrop-blur xl:block">
          <SidebarContent user={user} onLogout={handleLogout} />
        </aside>

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-white/50 bg-white/65 backdrop-blur">
            <div className="page-shell py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="xl:hidden" onClick={() => setMobileOpen(true)}>
                    <Menu className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Центр керування</p>
                      <p className="text-sm text-muted-foreground">{todayLabel}</p>
                    </div>
                    <div className="relative" ref={alarmsPanelRef}>
                      <button
                        type="button"
                        onClick={() => setAlarmsOpen((current) => !current)}
                        className={cn(
                          "relative flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition hover:shadow-md",
                          hasActiveAlarms
                            ? "border-red-200 bg-red-50/90 text-red-950"
                            : "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                        )}
                        aria-label="Активні тривоги"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl",
                            hasActiveAlarms ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                          )}
                        >
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <span
                          className={cn(
                            "absolute -right-2 -top-2 inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm",
                            hasActiveAlarms ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                          )}
                        >
                          {roomsQuery.isLoading ? "…" : activeAlarmsCount}
                        </span>
                      </button>

                      {alarmsOpen ? (
                        <div className="absolute left-0 top-[calc(100%+12px)] z-40 w-[min(92vw,360px)] rounded-3xl border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur">
                          <div className="mb-2 flex items-center justify-between px-2 py-1">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Активні тривоги</p>
                              <p className="text-xs text-muted-foreground">Поточні події по кімнатах системи</p>
                            </div>
                            <Link
                              to="/alarms"
                              className="text-xs font-semibold text-primary transition hover:opacity-80"
                              onClick={() => setAlarmsOpen(false)}
                            >
                              Усі тривоги
                            </Link>
                          </div>

                          {roomsQuery.isLoading ? (
                            <div className="rounded-2xl bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
                              Завантаження тривог...
                            </div>
                          ) : null}

                          {roomsQuery.isError ? (
                            <div className="rounded-2xl bg-red-50 px-4 py-5 text-sm text-red-700">
                              Не вдалося завантажити активні тривоги.
                            </div>
                          ) : null}

                          {!roomsQuery.isLoading && !roomsQuery.isError ? (
                            activeAlarmsCount === 0 ? (
                              <div className="rounded-2xl bg-emerald-50 px-4 py-5 text-sm text-emerald-700">
                                Зараз активних тривог немає.
                              </div>
                            ) : (
                              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                                {activeAlarms.map((alarm) => (
                                  <Link
                                    key={alarm._id}
                                    to="/alarms"
                                    onClick={() => setAlarmsOpen(false)}
                                    className="block rounded-2xl border border-white/80 bg-white/90 px-4 py-3 transition hover:border-red-200 hover:bg-red-50/60"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                          {formatAlarmReason(alarm.reason)}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                          {alarm.roomName || alarm.roomId || "Невідома кімната"}
                                        </p>
                                      </div>
                                      <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700">
                                        Тривога
                                      </span>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="hidden items-center gap-3 md:flex">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </div>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Вийти
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
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
            <SidebarContent onNavigate={() => setMobileOpen(false)} user={user} onLogout={handleLogout} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
