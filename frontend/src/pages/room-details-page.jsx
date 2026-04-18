import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Shield, Thermometer, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  armRoom,
  disarmRoom,
  fetchRoom,
  fetchRoomAlarms,
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
import { formatDateTime, formatNumber } from "@/shared/lib/utils";

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
    tempMin: 18,
    tempMax: 32,
    humidityMin: 30,
    humidityMax: 70,
  });

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

  const room = roomQuery.data;
  const state = stateQuery.data;
  const telemetry = telemetryQuery.data || [];
  const alarms = alarmsQuery.data || [];
  const events = eventsQuery.data || [];

  useEffect(() => {
    if (!state) return;

    setThresholds({
      tempMin: state.tempMinThreshold ?? 18,
      tempMax: state.tempMaxThreshold ?? 32,
      humidityMin: state.humidityMinThreshold ?? 30,
      humidityMax: state.humidityMaxThreshold ?? 70,
    });
  }, [state]);

  const refreshRoom = () => {
    queryClient.invalidateQueries({ queryKey: ["room", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-state", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-telemetry", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-alarms", roomId] });
    queryClient.invalidateQueries({ queryKey: ["room-events", roomId] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["alarms"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
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
      toast.success("Команду відправлено", `${variables.action} для кімнати ${roomId}`);
    },
    onError: (error) => {
      toast.error(
        "Не вдалося виконати команду",
        error?.response?.data?.message || "Спробуй ще раз."
      );
    },
  });

  const isLoading =
    roomQuery.isLoading ||
    stateQuery.isLoading ||
    telemetryQuery.isLoading ||
    alarmsQuery.isLoading ||
    eventsQuery.isLoading;

  const isError =
    roomQuery.isError ||
    stateQuery.isError ||
    telemetryQuery.isError ||
    alarmsQuery.isError ||
    eventsQuery.isError;

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
        <MetricCard
          icon={Wifi}
          label="Зв'язок"
          value={state?.offline ? "Офлайн" : "Онлайн"}
          hint={state?.deviceId || "Пристрій не прив'язано"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Поточний стан</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <StateRow label="Пристрій" value={state?.deviceId || room.deviceId || "—"} />
            <StateRow label="Статус" value={<StatusBadge online={!state?.offline} />} />
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
                  onChange={(value) => setThresholds((current) => ({ ...current, tempMin: value }))}
                />
                <ThresholdInput
                  label="Макс. температура"
                  value={thresholds.tempMax}
                  onChange={(value) => setThresholds((current) => ({ ...current, tempMax: value }))}
                />
                <ThresholdInput
                  label="Мін. вологість"
                  value={thresholds.humidityMin}
                  onChange={(value) => setThresholds((current) => ({ ...current, humidityMin: value }))}
                />
                <ThresholdInput
                  label="Макс. вологість"
                  value={thresholds.humidityMax}
                  onChange={(value) => setThresholds((current) => ({ ...current, humidityMax: value }))}
                />
              </div>
              <Button
                className="mt-4 w-full"
                disabled={actionMutation.isPending}
                onClick={() => setPendingAction({ action: "SET_THRESHOLDS", payload: thresholds })}
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
                      <p className="font-semibold text-rose-900">{alarm.reason}</p>
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
                      <p className="font-semibold">{event.eventName}</p>
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
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none ring-0 focus:border-primary"
      />
    </label>
  );
}

function getActionLabel(action) {
  if (action === "ARM") return "увімкнення охорони";
  if (action === "DISARM") return "вимкнення охорони";
  if (action === "RESET_ALARM") return "скидання тривоги";
  if (action === "SET_THRESHOLDS") return "збереження порогів";
  return "дію";
}
