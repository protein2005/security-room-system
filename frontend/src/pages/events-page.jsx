import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchEvents } from "@/shared/api/events";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { formatDateTime, formatEventName, formatEventSource } from "@/shared/lib/utils";

function EventsLoadingState() {
  return (
    <div className="space-y-4">
      <div className="glass-panel grid gap-3 p-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <LoadingSkeleton className="h-3 w-24" />
            <LoadingSkeleton className="mt-2 h-11 w-full" />
          </div>
        ))}
      </div>

      <div className="glass-panel space-y-4 p-6">
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
    </div>
  );
}

export function EventsPage() {
  const [filters, setFilters] = useState({
    search: "",
    source: "",
    roomId: "",
    sortOrder: "desc",
  });
  const deferredSearch = useDeferredValue(filters.search);
  const queryParams = useMemo(
    () => ({
      limit: 100,
      search: deferredSearch || undefined,
      source: filters.source || undefined,
      roomId: filters.roomId || undefined,
      sortOrder: filters.sortOrder,
    }),
    [deferredSearch, filters.roomId, filters.sortOrder, filters.source]
  );

  const eventsQuery = useQuery({
    queryKey: ["events", queryParams],
    queryFn: () => fetchEvents(queryParams),
  });

  const events = eventsQuery.data || [];

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Події"
        title="Журнал подій системи"
        description="Backend зберігає прив'язку пристроїв, локальні дії, заводське скидання та інші події аудиту. Тут вони доступні в одному потоці."
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
        <>
          <Card>
            <CardHeader>
              <CardTitle>Фільтри</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <FilterInput
                label="Пошук"
                value={filters.search}
                placeholder="event, room, device, details"
                onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
              />
              <FilterInput
                label="Кімната"
                value={filters.roomId}
                placeholder="room101"
                onChange={(value) => setFilters((current) => ({ ...current, roomId: value }))}
              />
              <FilterSelect
                label="Джерело"
                value={filters.source}
                onChange={(value) => setFilters((current) => ({ ...current, source: value }))}
                options={[
                  { value: "", label: "Усі джерела" },
                  { value: "system", label: formatEventSource("system") },
                  { value: "remote", label: formatEventSource("remote") },
                  { value: "local", label: formatEventSource("local") },
                ]}
              />
              <FilterSelect
                label="Сортування"
                value={filters.sortOrder}
                onChange={(value) => setFilters((current) => ({ ...current, sortOrder: value }))}
                options={[
                  { value: "desc", label: "Новіші зверху" },
                  { value: "asc", label: "Старіші зверху" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Усі події</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <EmptyState
                  title="Подій поки немає"
                  description="Після прив'язки пристрою та перших системних дій журнал почне автоматично наповнюватися."
                />
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event._id} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold">{formatEventName(event.eventName)}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.roomId || "система"} • {event.deviceId || "—"} • {formatEventSource(event.source)}
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
        </>
      ) : null}
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
      />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
