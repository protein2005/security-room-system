import { useDeferredValue, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCommands } from "@/shared/api/commands";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { formatCommandAction, formatDateTime, formatEventName, formatStatusCode } from "@/shared/lib/utils";

function CommandsLoadingState() {
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
            <LoadingSkeleton className="h-4 w-32" />
            <LoadingSkeleton className="mt-3 h-3 w-48" />
            <LoadingSkeleton className="mt-4 h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommandsPage() {
  const [filters, setFilters] = useState({
    search: "",
    action: "",
    status: "",
    hasOutcome: "",
    sortOrder: "desc",
  });
  const deferredSearch = useDeferredValue(filters.search);

  const queryParams = useMemo(
    () => ({
      limit: 100,
      search: deferredSearch || undefined,
      action: filters.action || undefined,
      status: filters.status || undefined,
      hasOutcome:
        filters.hasOutcome === ""
          ? undefined
          : filters.hasOutcome === "true"
            ? true
            : false,
      sortOrder: filters.sortOrder,
    }),
    [deferredSearch, filters.action, filters.hasOutcome, filters.sortOrder, filters.status]
  );

  const commandsQuery = useQuery({
    queryKey: ["commands", queryParams],
    queryFn: () => fetchCommands(queryParams),
    placeholderData: keepPreviousData,
  });

  const commands = commandsQuery.data || [];

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Команди"
        title="Журнал команд і підтверджень"
        description="Тут видно, хто відправив команду, коли вона пішла в MQTT і якою подією або статусом пристрій підтвердив виконання."
      />

      {commandsQuery.isLoading ? <CommandsLoadingState /> : null}

      {commandsQuery.isError ? (
        <ErrorState
          title="Не вдалося завантажити команди"
          description="Журнал команд тимчасово недоступний. Повтори спробу ще раз."
          onRetry={() => commandsQuery.refetch()}
        />
      ) : null}

      {!commandsQuery.isLoading && !commandsQuery.isError ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Фільтри</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <FilterInput
                label="Пошук"
                value={filters.search}
                placeholder="device, room, login, result"
                onChange={(value) => setFilters((current) => ({ ...current, search: value }))}
              />
              <FilterSelect
                label="Дія"
                value={filters.action}
                onChange={(value) => setFilters((current) => ({ ...current, action: value }))}
                options={[
                  { value: "", label: "Усі дії" },
                  { value: "PROVISION", label: formatCommandAction("PROVISION") },
                  { value: "ARM", label: formatCommandAction("ARM") },
                  { value: "DISARM", label: formatCommandAction("DISARM") },
                  { value: "RESET_ALARM", label: formatCommandAction("RESET_ALARM") },
                  { value: "SET_THRESHOLDS", label: formatCommandAction("SET_THRESHOLDS") },
                  { value: "FACTORY_RESET", label: formatCommandAction("FACTORY_RESET") },
                ]}
              />
              <FilterSelect
                label="Статус"
                value={filters.status}
                onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                options={[
                  { value: "", label: "Усі статуси" },
                  { value: "pending", label: "Очікує" },
                  { value: "published", label: "Опубліковано" },
                  { value: "acknowledged", label: "Підтверджено" },
                  { value: "failed", label: "Помилка" },
                ]}
              />
              <FilterSelect
                label="Результат"
                value={filters.hasOutcome}
                onChange={(value) => setFilters((current) => ({ ...current, hasOutcome: value }))}
                options={[
                  { value: "", label: "Усі" },
                  { value: "true", label: "Є підтвердження" },
                  { value: "false", label: "Без підтвердження" },
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
              <CardTitle>Команди</CardTitle>
              <CardDescription>
                Статус показує, чи команду вже відправлено та підтверджено пристроєм. Результат означає, що система
                знайшла подію або статус, які підтверджують виконання команди.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commands.length === 0 ? (
                <EmptyState
                  title="Команди не знайдено"
                  description="Спробуй змінити фільтри або виконай першу дію з кімнатою чи пристроєм."
                />
              ) : (
                <div className="space-y-3">
                  {commands.map((command) => (
                    <div key={command._id} className="list-item-panel">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold">{getCommandActionTitle(command.action)}</p>
                          <p className="text-sm text-muted-foreground">
                            {command.targetRoomId || "room: —"} • {command.targetDeviceId}
                          </p>
                          <p className="text-xs text-muted-foreground">{getCommandActionDescription(command.action)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge
                            online={command.status === "acknowledged" || command.status === "published"}
                            text={getCommandStatusLabel(command.status)}
                          />
                          <StatusBadge
                            online={Boolean(command.outcome?.matchedAt)}
                            text={command.outcome?.matchedAt ? "Є результат" : "Без результату"}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <MetaBlock label="Користувач" value={command.requestedBy?.name || command.requestedBy?.login || "—"} />
                        <MetaBlock label="Створено" value={formatDateTime(command.createdAt)} />
                        <MetaBlock label="Опубліковано" value={formatDateTime(command.publishedAt)} />
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm font-semibold">Результат</p>
                        <p className="mt-2 text-sm text-muted-foreground">{formatCommandOutcome(command)}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Підтверджено: {formatDateTime(command.acknowledgedAt || command.outcome?.matchedAt)}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <MetaBlock label="MQTT topic" value={command.mqttTopic || "—"} />
                        <MetaBlock label="Payload" value={formatPayload(command.payload)} />
                      </div>

                      {command.errorMessage ? (
                        <p className="mt-3 text-sm text-rose-700">Помилка: {command.errorMessage}</p>
                      ) : null}
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

function MetaBlock({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function formatPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "—";
  }

  return Object.entries(payload)
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}

function getCommandStatusLabel(status) {
  if (status === "acknowledged") return "Підтверджено";
  if (status === "published") return "Опубліковано";
  if (status === "failed") return "Помилка";
  return "Очікує";
}

function getCommandActionTitle(action) {
  if (action === "PROVISION") return "Прив'язка пристрою";
  if (action === "ARM") return "Увімкнення охорони";
  if (action === "DISARM") return "Вимкнення охорони";
  if (action === "RESET_ALARM") return "Скидання тривоги";
  if (action === "SET_THRESHOLDS") return "Оновлення порогів";
  if (action === "FACTORY_RESET") return "Заводське скидання";
  return action;
}

function getCommandActionDescription(action) {
  if (action === "PROVISION") return "Пристрій отримує прив'язку до кімнати і переходить у робочий режим.";
  if (action === "ARM") return "Система переходить у режим охорони.";
  if (action === "DISARM") return "Система виходить з режиму охорони.";
  if (action === "RESET_ALARM") return "Активна тривога скидається або приглушується.";
  if (action === "SET_THRESHOLDS") return "На пристрій передаються нові пороги температури та вологості.";
  if (action === "FACTORY_RESET") return "Пристрій повертається до заводського стану і втрачає прив'язку.";
  return "Системна команда.";
}

function formatCommandOutcome(command) {
  if (command.errorMessage) {
    return command.errorMessage;
  }

  if (command.outcome?.resultEventName) {
    return `Подія ${formatEventName(command.outcome.resultEventName)} підтвердила виконання.`;
  }

  if (command.outcome?.resultStatus) {
    return `Статус ${formatStatusCode(command.outcome.resultStatus)} підтвердив виконання.`;
  }

  if (command.status === "published") {
    return "Команда опублікована в MQTT, але підтвердження від пристрою ще не надійшло.";
  }

  return "Результат виконання ще не зафіксовано.";
}
