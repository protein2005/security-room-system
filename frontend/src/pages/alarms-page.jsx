import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAlarms } from "@/shared/api/alarms";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatDateTime } from "@/shared/lib/utils";

function AlarmsLoadingState() {
  return (
    <div className="glass-panel space-y-4 p-6">
      <LoadingSkeleton className="h-6 w-32" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-2xl bg-white/70 p-4">
          <div className="grid gap-3 md:grid-cols-[1.2fr,1fr,auto] md:items-center">
            <div>
              <LoadingSkeleton className="h-4 w-36" />
              <LoadingSkeleton className="mt-3 h-3 w-44" />
            </div>
            <div>
              <LoadingSkeleton className="h-3 w-36" />
              <LoadingSkeleton className="mt-2 h-3 w-36" />
            </div>
            <LoadingSkeleton className="h-10 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlarmsPage() {
  const alarmsQuery = useQuery({
    queryKey: ["alarms"],
    queryFn: () => fetchAlarms({ limit: 100 }),
  });

  const alarms = alarmsQuery.data || [];

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Тривоги"
        title="Журнал тривог"
        description="Єдине місце для перегляду активних і вже завершених тривог по всіх кімнатах системи."
      />

      {alarmsQuery.isLoading ? <AlarmsLoadingState /> : null}

      {alarmsQuery.isError ? (
        <ErrorState
          title="Не вдалося завантажити тривоги"
          description="Журнал тимчасово недоступний. Повтори запит ще раз."
          onRetry={() => alarmsQuery.refetch()}
        />
      ) : null}

      {!alarmsQuery.isLoading && !alarmsQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Усі тривоги</CardTitle>
          </CardHeader>
          <CardContent>
            {alarms.length === 0 ? (
              <EmptyState
                title="Тривог поки немає"
                description="Коли система зафіксує рух, відкриття дверей або іншу подію тривоги, запис з'явиться тут."
              />
            ) : (
              <div className="space-y-3">
                {alarms.map((alarm) => (
                  <div
                    key={alarm._id}
                    className="grid gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 md:grid-cols-[1.2fr,1fr,auto] md:items-center"
                  >
                    <div>
                      <p className="font-semibold">{alarm.reason}</p>
                      <p className="text-sm text-muted-foreground">
                        {alarm.roomId} • {alarm.deviceId}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Спрацювала: {formatDateTime(alarm.triggeredAt)}</p>
                      <p>Скинута: {formatDateTime(alarm.clearedAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge online={alarm.isActive} text={alarm.isActive ? "Активна" : "Закрита"} />
                      <StatusBadge
                        online={alarm.alarmSilenced}
                        text={alarm.alarmSilenced ? "Приглушена" : "У роботі"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
