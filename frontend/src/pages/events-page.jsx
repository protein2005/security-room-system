import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchEvents } from "@/shared/api/events";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { formatDateTime } from "@/shared/lib/utils";

function EventsLoadingState() {
  return (
    <div className="glass-panel space-y-4 p-6">
      <LoadingSkeleton className="h-6 w-32" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-2xl bg-white/70 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <LoadingSkeleton className="h-4 w-32" />
              <LoadingSkeleton className="mt-3 h-3 w-48" />
            </div>
            <LoadingSkeleton className="h-3 w-32" />
          </div>
          <LoadingSkeleton className="mt-4 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

export function EventsPage() {
  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => fetchEvents({ limit: 100 }),
  });

  const events = eventsQuery.data || [];

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Події"
        title="Журнал подій системи"
        description="Backend зберігає provisioning, локальні дії, factory reset та інші події аудиту. Тут вони доступні в одному потоці."
      />

      {eventsQuery.isLoading ? <EventsLoadingState /> : null}

      {eventsQuery.isError ? (
        <ErrorState
          title="Не вдалося завантажити події"
          description="Журнал подій тимчасово недоступний. Повтори спробу ще раз."
          onRetry={() => eventsQuery.refetch()}
        />
      ) : null}

      {!eventsQuery.isLoading && !eventsQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Усі події</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                title="Подій поки немає"
                description="Після provisioning та перших системних дій журнал почне автоматично наповнюватися."
              />
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event._id} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold">{event.eventName}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.roomId || "система"} • {event.deviceId || "—"} • {event.source || "система"}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {event.details || "Додаткові деталі для цієї події не передано."}
                    </p>
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
