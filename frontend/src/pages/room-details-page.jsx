import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Shield, Thermometer, Wifi } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  armRoom,
  disarmRoom,
  fetchRoom,
  fetchRoomAlarms,
  fetchRoomCommands,
  fetchRoomEvents,
  fetchRoomState,
  fetchRoomTelemetry,
  resetRoomAlarm,
  updateRoomThresholds,
} from "@/shared/api/rooms";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingCardGrid, LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { MetricCard } from "@/shared/components/metric-card";
import { SectionHeading } from "@/shared/components/section-heading";
import { SparklineChart } from "@/shared/components/sparkline-chart";
import { StatusBadge } from "@/shared/components/status-badge";
import { useToast } from "@/shared/feedback/toast-provider";
import { formatAlarmReason, formatCommandAction, formatDateTime, formatEventName, formatNumber, formatStatusCode } from "@/shared/lib/utils";

function RoomDetailsLoadingState() {
  return (
    <div className="space-y-4">
      <LoadingCardGrid count={4} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="glass-panel space-y-4 p-6">
            <LoadingSkeleton className="h-6 w-32" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((__, rowIndex) => (
                <div key={rowIndex} className="rounded-2xl bg-white/70 p-4">
                  <LoadingSkeleton className="h-3 w-20" />
                  <LoadingSkeleton className="mt-3 h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoomDetailsPage() {
  const { roomId } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pendingAction, setPendingAction] = useState(null);
  const [thresholds, setThresholds] = useState({
    tempMin: "18",
    tempMax: "32",
    humidityMin: "30",
    humidityMax: "70",
  });
  const [isThresholdFormDirty, setIsThresholdFormDirty] = useState(false);

  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => fetchRoom(roomId),
    enabled: Boolean(roomId),
  });

  const stateQuery = useQuery({
    queryKey: ["room-state", roomId],
    queryFn: () => fetchRoomState(roomId),
    enabled: Boolean(roomId),
  });

  const telemetryQuery = useQuery({
    queryKey: ["room-telemetry", roomId],
    queryFn: () => fetchRoomTelemetry(roomId, 24),
    enabled: Boolean(roomId),
  });

  const alarmsQuery = useQuery({
    queryKey: ["room-alarms", roomId],
    queryFn: () => fetchRoomAlarms(roomId, { limit: 10 }),
    enabled: Boolean(roomId),
  });

  const eventsQuery = useQuery({
    queryKey: ["room-events", roomId],
    queryFn: () => fetchRoomEvents(roomId, { limit: 10 }),
    enabled: Boolean(roomId),
  });

  const commandsQuery = useQuery({
    queryKey: ["room-commands", roomId],
    queryFn: () => fetchRoomCommands(roomId, { limit: 10 }),
    enabled: Boolean(roomId),
  });

  const room = roomQuery.data;
  const state = stateQuery.data;
  const telemetry = telemetryQuery.data || [];
  const alarms = alarmsQuery.data || [];
  const events = eventsQuery.data || [];
  const commands = commandsQuery.data || [];
  const syncedThresholds = useMemo(() => getThresholdFormValues(state), [state]);

  useEffect(() => {
    if (!state) return;
    if (isThresholdFormDirty) return;

    setThresholds(syncedThresholds);
  }, [isThresholdFormDirty, state, syncedThresholds]);

  useEffect(() => {
    if (!state) return;

    if (areThresholdFormsEqual(thresholds, syncedThresholds)) {
      setIsThresholdFormDirty(false);
    }
  }, [state, syncedThresholds, thresholds]);

  const refreshRoom = () => {
    queryClient.invalidateQueries({ queryKey: ["room", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-state", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-telemetry", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-alarms", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-events", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-commands", roomId] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["alarms"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["commands"] });
  };

  const actionMutation = useMutation({
    mutationFn: async ({ action, payload }) => {
      if (action === "ARM") return armRoom(roomId);
      if (action === "DISARM") return disarmRoom(roomId);
      if (action === "RESET_ALARM") return resetRoomAlarm(roomId);
      if (action === "SET_THRESHOLDS") return updateRoomThresholds(roomId, payload);
      throw new Error("Непідтримувана дія");
    },
    onSuccess: (_data, variables) => {
      setPendingAction(null);
      refreshRoom();
      toast.success("Команду відправлено", `${formatCommandAction(variables.action)} для кімнати ${roomId}`);
    },
    onError: (error) => {
      toast.error("Не вдалося виконати команду", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  const isLoading =
    roomQuery.isLoading ||
    stateQuery.isLoading ||
    telemetryQuery.isLoading ||
    alarmsQuery.isLoading ||
    eventsQuery.isLoading ||
    commandsQuery.isLoading;

  const isError =
    roomQuery.isError ||
    stateQuery.isError ||
    telemetryQuery.isError ||
    alarmsQuery.isError ||
    eventsQuery.isError ||
    commandsQuery.isError;

  if (isLoading) {
    return (
      <div className="page-shell">
        <SectionHeading eyebrow="Кімната" title="Завантаження кімнати..." />
        <RoomDetailsLoadingState />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-shell">
        <ErrorState
          title="Не вдалося завантажити кімнату"
          description="Один із запитів завершився з помилкою. Повтори спробу ще раз."
          onRetry={() => {
            roomQuery.refetch();
            stateQuery.refetch();
            telemetryQuery.refetch();
            alarmsQuery.refetch();
            eventsQuery.refetch();
            commandsQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page-shell">
        <EmptyState
          title="Кімнату не знайдено"
          description="Перевір ідентифікатор кімнати або повернися до загального списку."
        />
      </div>
    );
  }

  const tempSeries = telemetry
    .slice()
    .reverse()
    .map((item) => item.temperature)
    .filter((value) => value !== null && value !== undefined);

  const humiditySeries = telemetry
    .slice()
    .reverse()
    .map((item) => item.humidity)
    .filter((value) => value !== null && value !== undefined);

  const assignedDeviceId = state?.deviceId || room.deviceId || "";
  const hasAssignedDevice = Boolean(assignedDeviceId);
  const connectivityValue = !hasAssignedDevice ? "Не прив'язано" : state?.offline ? "Офлайн" : "Онлайн";
  const connectivityHint = hasAssignedDevice
    ? assignedDeviceId
    : "Пристрій для цієї кімнати ще не прив'язано";
  const stateBadgeOnline = hasAssignedDevice && !state?.offline;
  const stateBadgeText = !hasAssignedDevice ? "Не прив'язано" : state?.offline ? "Офлайн" : "Онлайн";

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Кімната"
        title={room.roomName}
        description={`${room.roomId} • ${room.zoneType}`}
        actions={
          <Link
            to="/rooms"
            className="rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-medium hover:bg-white"
          >
            Назад до кімнат
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Thermometer}
          label="Температура"
          value={`${formatNumber(state?.temperature)} °C`}
          hint="Поточна температура в кімнаті"
        />
        <MetricCard
          icon={Droplets}
          label="Вологість"
          value={`${formatNumber(state?.humidity)} %`}
          hint="Поточна вологість у кімнаті"
        />
        <MetricCard
          icon={Shield}
          label="Охорона"
          value={state?.armed ? "Увімкнена" : "Вимкнена"}
          hint={state?.alarmActive ? "Є активна тривога" : "Нормальний стан"}
        />
        <MetricCard icon={Wifi} label="Зв'язок" value={connectivityValue} hint={connectivityHint} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Поточний стан</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <StateRow label="Пристрій" value={assignedDeviceId || "—"} />
            <StateRow label="Статус" value={<StatusBadge online={stateBadgeOnline} text={stateBadgeText} />} />
            <StateRow label="Рух" value={state?.motion ? "Виявлено" : "Немає"} />
            <StateRow label="Двері" value={state?.door ? "Відчинено" : "Зачинено"} />
            <StateRow label="Помилка сенсора" value={state?.sensorFailure ? "Так" : "Ні"} />
            <StateRow label="Тривога" value={state?.alarmActive ? state?.alarmReason || "Активна" : "Немає"} />
            <StateRow
              label="Пороги температури"
              value={`${formatNumber(state?.tempMinThreshold)} / ${formatNumber(state?.tempMaxThreshold)}`}
            />
            <StateRow
              label="Пороги вологості"
              value={`${formatNumber(state?.humidityMinThreshold)} / ${formatNumber(state?.humidityMaxThreshold)}`}
            />
            <StateRow label="Оновлено" value={formatDateTime(state?.updatedAt)} />
            <StateRow label="Остання телеметрія" value={formatDateTime(state?.lastTelemetryAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Дії</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Button disabled={actionMutation.isPending} onClick={() => setPendingAction({ action: "ARM" })}>
                {actionMutation.isPending && pendingAction?.action === "ARM" ? "Відправка..." : "Увімкнути"}
              </Button>
              <Button
                variant="secondary"
                disabled={actionMutation.isPending}
                onClick={() => setPendingAction({ action: "DISARM" })}
              >
                {actionMutation.isPending && pendingAction?.action === "DISARM" ? "Відправка..." : "Вимкнути"}
              </Button>
              <Button
                variant="outline"
                disabled={actionMutation.isPending}
                onClick={() => setPendingAction({ action: "RESET_ALARM" })}
              >
                {actionMutation.isPending && pendingAction?.action === "RESET_ALARM" ? "Відправка..." : "Скинути тривогу"}
              </Button>
            </div>

            <div className="rounded-2xl bg-white/75 p-4">
              <p className="mb-3 text-sm font-semibold">Пороги спрацювання</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ThresholdInput
                  label="Мін. температура"
                  value={thresholds.tempMin}
                  onChange={(value) => updateThresholdField("tempMin", value, setThresholds, setIsThresholdFormDirty)}
                />
                <ThresholdInput
                  label="Макс. температура"
                  value={thresholds.tempMax}
                  onChange={(value) => updateThresholdField("tempMax", value, setThresholds, setIsThresholdFormDirty)}
                />
                <ThresholdInput
                  label="Мін. вологість"
                  value={thresholds.humidityMin}
                  onChange={(value) => updateThresholdField("humidityMin", value, setThresholds, setIsThresholdFormDirty)}
                />
                <ThresholdInput
                  label="Макс. вологість"
                  value={thresholds.humidityMax}
                  onChange={(value) => updateThresholdField("humidityMax", value, setThresholds, setIsThresholdFormDirty)}
                />
              </div>
              <Button
                className="mt-4 w-full"
                disabled={actionMutation.isPending}
                onClick={() => {
                  const parsedThresholds = parseThresholdForm(thresholds);
                  if (!parsedThresholds) {
                    toast.error(
                      "Не вдалося зберегти пороги",
                      "Перевір, що всі значення заповнені числами і мінімальні пороги менші за максимальні."
                    );
                    return;
                  }

                  setPendingAction({ action: "SET_THRESHOLDS", payload: parsedThresholds });
                }}
              >
                {actionMutation.isPending && pendingAction?.action === "SET_THRESHOLDS"
                  ? "Відправка..."
                  : "Зберегти пороги"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Історія температури</CardTitle>
          </CardHeader>
          <CardContent>
            <SparklineChart data={tempSeries} color="#0f766e" label="Температура" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Історія вологості</CardTitle>
          </CardHeader>
          <CardContent>
            <SparklineChart data={humiditySeries} color="#2563eb" label="Вологість" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Тривоги кімнати</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alarms.length === 0 ? (
              <EmptyState
                title="Тривог для цієї кімнати не було"
                description="Коли система зафіксує інцидент у цій зоні, запис з'явиться тут."
              />
            ) : (
              alarms.map((alarm) => (
                <div key={alarm._id} className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-rose-900">{formatAlarmReason(alarm.reason)}</p>
                      <p className="text-xs text-rose-700">{formatDateTime(alarm.triggeredAt)}</p>
                    </div>
                    <StatusBadge online={alarm.isActive} text={alarm.isActive ? "Активна" : "Закрита"} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Події кімнати</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <EmptyState
                title="Подій для цієї кімнати ще немає"
                description="Після перших дій або змін стану журнал цієї кімнати почне наповнюватися."
              />
            ) : (
              events.map((event) => (
                <div key={event._id} className="rounded-2xl bg-white/80 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{formatEventName(event.eventName)}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.source || "система"} • {formatDateTime(event.createdAt)}
                      </p>
                    </div>
                    <StatusBadge online={!event.offline} text={event.offline ? "Офлайн" : "Активно"} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.details || "Додаткові деталі для цієї події не передано."}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Історія команд</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {commands.length === 0 ? (
            <EmptyState
              title="Команд для цієї кімнати ще немає"
              description="Після увімкнення охорони, вимкнення охорони, скидання тривоги або зміни порогів команди з'являться тут."
            />
          ) : (
            commands.map((command) => (
              <div
                key={command._id}
                className="grid gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 md:grid-cols-[1fr,1fr,auto] md:items-center"
              >
                <div>
                  <p className="font-semibold">{getCommandActionTitle(command.action)}</p>
                  <p className="text-sm text-muted-foreground">
                    {command.requestedBy?.name || command.requestedBy?.email || "Невідомий користувач"}
                  </p>
                  <p className="text-xs text-muted-foreground">{getCommandActionDescription(command.action)}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Статус: {getCommandStatusLabel(command.status)}</p>
                  <p>Час: {formatDateTime(command.publishedAt || command.createdAt)}</p>
                  <p>Результат: {getCommandOutcomeLabel(command)}</p>
                </div>
                <div className="flex justify-end">
                  <StatusBadge
                    online={command.status === "published" || command.status === "acknowledged"}
                    text={getCommandStatusLabel(command.status)}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title="Підтвердити дію"
        description={
          pendingAction?.action === "SET_THRESHOLDS"
            ? `Зберегти нові пороги для ${room.roomName}?`
            : `Виконати ${getActionLabel(pendingAction?.action)} для кімнати ${room.roomName}?`
        }
        confirmLabel="Так, виконати"
        loading={actionMutation.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          actionMutation.mutate(pendingAction);
        }}
      />
    </div>
  );
}

function StateRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}

function ThresholdInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none ring-0 focus:border-primary"
      />
    </label>
  );
}

function getThresholdFormValues(state) {
  return {
    tempMin: String(state?.tempMinThreshold ?? 18),
    tempMax: String(state?.tempMaxThreshold ?? 32),
    humidityMin: String(state?.humidityMinThreshold ?? 30),
    humidityMax: String(state?.humidityMaxThreshold ?? 70),
  };
}

function updateThresholdField(field, value, setThresholds, setIsThresholdFormDirty) {
  setIsThresholdFormDirty(true);
  setThresholds((current) => ({ ...current, [field]: value }));
}

function areThresholdFormsEqual(left, right) {
  return (
    left.tempMin === right.tempMin &&
    left.tempMax === right.tempMax &&
    left.humidityMin === right.humidityMin &&
    left.humidityMax === right.humidityMax
  );
}

function parseThresholdForm(thresholds) {
  const rawValues = Object.values(thresholds);
  if (rawValues.some((value) => String(value).trim() === "")) {
    return null;
  }

  const values = {
    tempMin: Number(thresholds.tempMin),
    tempMax: Number(thresholds.tempMax),
    humidityMin: Number(thresholds.humidityMin),
    humidityMax: Number(thresholds.humidityMax),
  };

  const hasInvalidValue = Object.values(values).some((value) => Number.isNaN(value));
  if (hasInvalidValue) {
    return null;
  }

  if (values.tempMin >= values.tempMax || values.humidityMin >= values.humidityMax) {
    return null;
  }

  return values;
}

function getActionLabel(action) {
  if (action === "ARM") return "увімкнення охорони";
  if (action === "DISARM") return "вимкнення охорони";
  if (action === "RESET_ALARM") return "скидання тривоги";
  if (action === "SET_THRESHOLDS") return "збереження порогів";
  return "дію";
}

function getActionCodeLabel(action) {
  if (action === "ARM") return "ARM";
  if (action === "DISARM") return "DISARM";
  if (action === "RESET_ALARM") return "RESET_ALARM";
  if (action === "SET_THRESHOLDS") return "SET_THRESHOLDS";
  if (action === "PROVISION") return "PROVISION";
  if (action === "FACTORY_RESET") return "FACTORY_RESET";
  return action;
}

function getCommandStatusLabel(status) {
  if (status === "acknowledged") return "Підтверджено";
  if (status === "published") return "Відправлено";
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

function getCommandOutcomeLabel(command) {
  if (command.outcome?.resultEventName) {
    return formatEventName(command.outcome.resultEventName);
  }

  if (command.outcome?.resultStatus) {
    return formatStatusCode(command.outcome.resultStatus);
  }

  if (command.status === "failed") {
    return "Не виконано";
  }

  if (command.status === "published") {
    return "Очікує підтвердження";
  }

  return "Ще немає";
}
