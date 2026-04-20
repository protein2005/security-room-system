import { useDeferredValue, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAlarms } from "@/shared/api/alarms";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatAlarmReason, formatDateTime } from "@/shared/lib/utils";

function AlarmsLoadingState() {
  return (
    <div className="space-y-4">
      <div className="glass-panel grid gap-3 p-6 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index}>
            <LoadingSkeleton className="h-3 w-24" />
            <LoadingSkeleton className="mt-2 h-11 w-full" />
          </div>
        ))}
      </div>

      <div className="glass-panel space-y-4 p-6">
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
    </div>
  );
}

export function AlarmsPage() {
  const [filters, setFilters] = useState({
    search: "",
    reason: "",
    active: "",
    silenced: "",
    sortOrder: "desc",
  });
  const deferredSearch = useDeferredValue(filters.search);
  const queryParams = useMemo(
    () => ({
      limit: 100,
      search: deferredSearch || undefined,
      reason: filters.reason || undefined,
      active:
        filters.active === ""
          ? undefined
          : filters.active === "true"
            ? true
            : false,
      silenced:
        filters.silenced === ""
          ? undefined
          : filters.silenced === "true"
            ? true
            : false,
      sortOrder: filters.sortOrder,
    }),
    [deferredSearch, filters.active, filters.reason, filters.silenced, filters.sortOrder]
  );

  const alarmsQuery = useQuery({
    queryKey: ["alarms", queryParams],
    queryFn: () => fetchAlarms(queryParams),
    placeholderData: keepPreviousData,
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
        <>
          <Card>
            <CardHeader>
              <CardTitle>Фільтри</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <FilterInput
                label="Пошук"
                value={filters.search}
                placeholder="room, device, reason"
                onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
              />
              <FilterInput
                label="Причина"
                value={filters.reason}
                placeholder="DOOR_OPEN"
                onChange={(value) => setFilters((current) => ({ ...current, reason: value }))}
              />
              <FilterSelect
                label="Активність"
                value={filters.active}
                onChange={(value) => setFilters((current) => ({ ...current, active: value }))}
                options={[
                  { value: "", label: "Усі" },
                  { value: "true", label: "Активні" },
                  { value: "false", label: "Закриті" },
                ]}
              />
              <FilterSelect
                label="Приглушення"
                value={filters.silenced}
                onChange={(value) => setFilters((current) => ({ ...current, silenced: value }))}
                options={[
                  { value: "", label: "Усі" },
                  { value: "true", label: "Приглушені" },
                  { value: "false", label: "Не приглушені" },
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
              <CardTitle>Усі тривоги</CardTitle>
            </CardHeader>
            <CardContent>
              {alarms.length === 0 ? (
                <EmptyState
                  title="Тривог поки немає"
                  description="Коли система зафіксує рух, відкриття дверей або іншу тривожну подію, запис з'явиться тут."
                />
              ) : (
                <div className="space-y-3">
                  {alarms.map((alarm) => (
                    <div
                      key={alarm._id}
                      className="grid gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 md:grid-cols-[1.2fr,1fr,auto] md:items-center"
                    >
                      <div>
                        <p className="font-semibold">{formatAlarmReason(alarm.reason)}</p>
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
