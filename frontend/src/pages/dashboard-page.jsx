import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Cpu, DoorOpen } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardData } from "@/shared/api/dashboard";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingCardGrid, LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { MetricCard } from "@/shared/components/metric-card";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime, formatEventName } from "@/shared/lib/utils";

function DashboardLoadingState() {
  return (
    <div className="space-y-4">
      <LoadingCardGrid count={4} />

      <div className="grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
        <div className="glass-panel space-y-4 p-6">
          <LoadingSkeleton className="h-6 w-44" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-white/70 p-4">
                <LoadingSkeleton className="h-4 w-28" />
                <LoadingSkeleton className="mt-3 h-3 w-20" />
                <LoadingSkeleton className="mt-5 h-3 w-full" />
                <LoadingSkeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="glass-panel space-y-4 p-6">
              <LoadingSkeleton className="h-6 w-32" />
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div key={rowIndex} className="rounded-2xl bg-white/70 p-4">
                  <LoadingSkeleton className="h-4 w-32" />
                  <LoadingSkeleton className="mt-3 h-3 w-40" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });

  const devices = dashboardQuery.data?.devices || [];
  const rooms = dashboardQuery.data?.rooms || [];
  const alarms = dashboardQuery.data?.alarms || [];
  const events = dashboardQuery.data?.events || [];

  const onlineDevices = devices.filter((item) => item.online).length;
  const assignedRooms = rooms.filter((item) => item.deviceId).length;

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Огляд"
        title="Оперативна панель системи"
        description="Швидкий огляд стану пристроїв, кімнат, активних тривог та останніх подій для роботи з браузера або мобілки."
      />

      {dashboardQuery.isLoading ? <DashboardLoadingState /> : null}

      {dashboardQuery.isError ? (
        <ErrorState
          title="Не вдалося завантажити панель"
          description="Backend не відповів або сталася помилка під час запиту. Повтори спробу ще раз."
          onRetry={() => dashboardQuery.refetch()}
        />
      ) : null}

      {!dashboardQuery.isLoading && !dashboardQuery.isError ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Cpu}
              label="Пристрої"
              value={devices.length}
              hint={`${onlineDevices} онлайн зараз`}
            />
            <MetricCard
              icon={DoorOpen}
              label="Кімнати"
              value={rooms.length}
              hint={`${assignedRooms} уже прив'язано`}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Активні тривоги"
              value={alarms.length}
              hint="Останні відкриті інциденти"
            />
            <MetricCard
              icon={Activity}
              label="Останні події"
              value={events.length}
              hint="Операційний журнал системи"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
            <Card>
              <CardHeader>
                <CardTitle>Кімнати під наглядом</CardTitle>
              </CardHeader>
              <CardContent>
                {rooms.length === 0 ? (
                  <EmptyState
                    title="Кімнат ще немає"
                    description="Створи першу кімнату та прив'яжи до неї ESP32, щоб бачити live-стан і телеметрію."
                    actions={
                      <Button asChild>
                        <Link to="/provisioning">Відкрити прив'язку</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {rooms.slice(0, 6).map((room) => (
                      <div key={room.roomId} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{room.roomName}</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{room.zoneType}</p>
                          </div>
                          <StatusBadge
                            online={Boolean(room.deviceId)}
                            text={room.deviceId ? "Прив'язано" : "Порожньо"}
                          />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Пристрій</p>
                            <p className="font-medium">{room.deviceId || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Остання телеметрія</p>
                            <p className="font-medium">{formatDateTime(room.lastTelemetryAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Останні події</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {events.length === 0 ? (
                    <EmptyState
                      title="Подій поки немає"
                      description="Після прив'язки пристрою та перших системних дій журнал почне наповнюватися автоматично."
                    />
                  ) : (
                    events.slice(0, 5).map((event) => (
                      <div key={event._id} className="rounded-2xl bg-white/80 p-3">
                        <p className="text-sm font-semibold">{formatEventName(event.eventName)}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.roomId || "система"} • {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Тривоги</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {alarms.length === 0 ? (
                    <EmptyState
                      title="Активних тривог немає"
                      description="Коли система зафіксує інцидент, він з'явиться тут і на сторінці журналу тривог."
                    />
                  ) : (
                    alarms.slice(0, 5).map((alarm) => (
                      <div key={alarm._id} className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm font-semibold text-rose-800">{alarm.reason}</p>
                        <p className="text-xs text-rose-700">
                          {alarm.roomId} • {formatDateTime(alarm.triggeredAt)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
