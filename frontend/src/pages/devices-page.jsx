import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { factoryResetDevice, fetchDevices, fetchUnprovisionedDevices } from "@/shared/api/devices";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingCardGrid, LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { useToast } from "@/shared/feedback/toast-provider";
import { formatDateTime } from "@/shared/lib/utils";
import { useState } from "react";

function DevicesLoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr,1.2fr]">
      <div className="glass-panel space-y-4 p-6">
        <LoadingSkeleton className="h-6 w-40" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl bg-white/70 p-4">
            <LoadingSkeleton className="h-4 w-32" />
            <LoadingSkeleton className="mt-3 h-3 w-28" />
            <LoadingSkeleton className="mt-4 h-3 w-36" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <LoadingCardGrid count={2} />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass-panel p-5">
            <div className="grid gap-3 md:grid-cols-[1.5fr,1fr,1fr,auto] md:items-center">
              <div>
                <LoadingSkeleton className="h-4 w-36" />
                <LoadingSkeleton className="mt-3 h-3 w-28" />
              </div>
              <LoadingSkeleton className="h-4 w-20" />
              <LoadingSkeleton className="h-4 w-24" />
              <LoadingSkeleton className="h-10 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DevicesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pendingFactoryReset, setPendingFactoryReset] = useState(null);

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => fetchDevices(),
  });

  const unprovisionedQuery = useQuery({
    queryKey: ["devices", "unprovisioned"],
    queryFn: fetchUnprovisionedDevices,
  });

  const factoryResetMutation = useMutation({
    mutationFn: factoryResetDevice,
    onSuccess: (_data, deviceId) => {
      setPendingFactoryReset(null);
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      toast.success("Команду factory reset відправлено", `Пристрій ${deviceId} отримав команду скидання.`);
    },
    onError: (error) => {
      toast.error(
        "Не вдалося виконати factory reset",
        error?.response?.data?.message || "Спробуй ще раз або перевір права доступу."
      );
    },
  });

  const devices = devicesQuery.data || [];
  const unprovisioned = unprovisionedQuery.data || [];

  const isLoading = devicesQuery.isLoading || unprovisionedQuery.isLoading;
  const isError = devicesQuery.isError || unprovisionedQuery.isError;

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Пристрої"
        title="Реєстр підключених пристроїв"
        description="Список усіх ESP32, які backend побачив у MQTT. Тут легко зрозуміти, які вузли вже прив'язані, а які ще очікують на provisioning."
      />

      {isLoading ? <DevicesLoadingState /> : null}

      {isError ? (
        <ErrorState
          title="Не вдалося завантажити пристрої"
          description="Один із запитів завершився з помилкою. Перевір backend і повтори спробу."
          onRetry={() => {
            devicesQuery.refetch();
            unprovisionedQuery.refetch();
          }}
        />
      ) : null}

      {!isLoading && !isError ? (
        <div className="grid gap-4 xl:grid-cols-[0.8fr,1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Неприв'язані пристрої</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unprovisioned.length === 0 ? (
                <EmptyState
                  title="Усі пристрої вже прив'язані"
                  description="Щойно новий ESP32 з'явиться в брокері, він потрапить у цей список."
                  actions={
                    <Button asChild variant="outline">
                      <Link to="/provisioning">Перейти до прив'язки</Link>
                    </Button>
                  }
                />
              ) : (
                unprovisioned.map((device) => (
                  <div key={device._id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">{device.deviceId}</p>
                    <p className="mt-1 text-sm text-amber-800">
                      {device.firmwareVersion || "Немає даних про прошивку"}
                    </p>
                    <p className="mt-2 text-xs text-amber-700">
                      Остання активність: {formatDateTime(device.lastSeenAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Усі пристрої</CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <EmptyState
                  title="Пристроїв ще немає"
                  description="Після першого heartbeat новий ESP32 автоматично з'явиться в реєстрі."
                  actions={
                    <Button asChild>
                      <Link to="/provisioning">Відкрити provisioning</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div
                      key={device._id}
                      className="grid gap-4 rounded-2xl border border-white/70 bg-white/80 p-4 md:grid-cols-[1.4fr,0.9fr,0.9fr,auto] md:items-center"
                    >
                      <div>
                        <p className="font-semibold">{device.deviceId}</p>
                        <p className="text-sm text-muted-foreground">{device.deviceType}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Прошивка</p>
                        <p className="text-sm font-medium">{device.firmwareVersion || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Кімната</p>
                        <p className="text-sm font-medium">{device.currentRoomId || "Не прив'язано"}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <StatusBadge online={device.online} />
                        <StatusBadge
                          online={device.provisioned}
                          text={device.provisioned ? "Прив'язано" : "Очікує"}
                        />
                        {user?.role === "admin" ? (
                          <Button
                            variant="outline"
                            disabled={factoryResetMutation.isPending}
                            onClick={() => setPendingFactoryReset(device)}
                          >
                            {factoryResetMutation.isPending && pendingFactoryReset?.deviceId === device.deviceId
                              ? "Відправка..."
                              : "Factory reset"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingFactoryReset)}
        title="Підтвердити factory reset"
        description={
          pendingFactoryReset
            ? `Скинути пристрій ${pendingFactoryReset.deviceId} до заводських налаштувань? Після перезапуску його доведеться прив'язати заново.`
            : "Підтвердити factory reset?"
        }
        confirmLabel="Так, скинути"
        loading={factoryResetMutation.isPending}
        onCancel={() => setPendingFactoryReset(null)}
        onConfirm={() => {
          if (!pendingFactoryReset) return;
          factoryResetMutation.mutate(pendingFactoryReset.deviceId);
        }}
      />
    </div>
  );
}
