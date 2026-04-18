import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUnprovisionedDevices } from "@/shared/api/devices";
import { provisionDevice } from "@/shared/api/provisioning";
import { createRoom, fetchRooms } from "@/shared/api/rooms";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { useToast } from "@/shared/feedback/toast-provider";
import { formatDateTime } from "@/shared/lib/utils";

const initialRoomForm = {
  roomId: "",
  roomName: "",
  zoneType: "",
  description: "",
};

function ProvisioningLoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
      <div className="glass-panel space-y-4 p-6">
        <LoadingSkeleton className="h-6 w-40" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <LoadingSkeleton className="h-4 w-24" />
            <LoadingSkeleton className="mt-2 h-12 w-full" />
          </div>
        ))}
        <LoadingSkeleton className="h-12 w-full" />
      </div>

      <div className="glass-panel space-y-4 p-6">
        <LoadingSkeleton className="h-6 w-52" />
        <LoadingSkeleton className="h-12 w-full" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl bg-white/70 p-4">
            <LoadingSkeleton className="h-4 w-32" />
            <LoadingSkeleton className="mt-3 h-3 w-28" />
            <LoadingSkeleton className="mt-4 h-10 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProvisioningPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [roomForm, setRoomForm] = useState(initialRoomForm);
  const [pendingProvision, setPendingProvision] = useState(null);

  const unprovisionedQuery = useQuery({
    queryKey: ["devices", "unprovisioned"],
    queryFn: fetchUnprovisionedDevices,
  });

  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const unprovisioned = unprovisionedQuery.data || [];
  const rooms = roomsQuery.data || [];
  const availableRooms = useMemo(() => rooms.filter((room) => !room.deviceId), [rooms]);
  const selectedRoom = availableRooms.find((room) => room.roomId === selectedRoomId);

  const createRoomMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      setRoomForm(initialRoomForm);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Кімнату створено", "Тепер її можна використати для прив'язки пристрою.");
    },
    onError: (error) => {
      toast.error(
        "Не вдалося створити кімнату",
        error?.response?.data?.message || "Перевір поля форми та спробуй ще раз."
      );
    },
  });

  const provisionMutation = useMutation({
    mutationFn: ({ deviceId, roomId }) => provisionDevice(deviceId, roomId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["devices", "unprovisioned"] });
      setPendingProvision(null);
      toast.success("Команду прив'язки відправлено", `${variables.deviceId} -> ${variables.roomId}`);
    },
    onError: (error) => {
      toast.error(
        "Прив'язка не вдалася",
        error?.response?.data?.message || "Не вдалося відправити MQTT-команду на пристрій."
      );
    },
  });

  const isLoading = unprovisionedQuery.isLoading || roomsQuery.isLoading;
  const isError = unprovisionedQuery.isError || roomsQuery.isError;

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Прив'язка"
        title="Створення кімнат і підключення нових ESP32"
        description="Тут можна створити нову кімнату прямо з фронтенду, а потім відправити команду provisioning для будь-якого нового пристрою."
      />

      {isLoading ? <ProvisioningLoadingState /> : null}

      {isError ? (
        <ErrorState
          title="Не вдалося завантажити дані для прив'язки"
          description="Один із запитів завершився з помилкою. Повтори спробу ще раз."
          onRetry={() => {
            unprovisionedQuery.refetch();
            roomsQuery.refetch();
          }}
        />
      ) : null}

      {!isLoading && !isError ? (
        <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Створити кімнату</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  createRoomMutation.mutate(roomForm);
                }}
              >
                <Input
                  label="Ідентифікатор кімнати"
                  value={roomForm.roomId}
                  onChange={(value) => setRoomForm((current) => ({ ...current, roomId: value }))}
                  placeholder="room101"
                />
                <Input
                  label="Назва кімнати"
                  value={roomForm.roomName}
                  onChange={(value) => setRoomForm((current) => ({ ...current, roomName: value }))}
                  placeholder="Server Room 101"
                />
                <Input
                  label="Тип зони"
                  value={roomForm.zoneType}
                  onChange={(value) => setRoomForm((current) => ({ ...current, zoneType: value }))}
                  placeholder="server_room"
                />
                <Input
                  label="Опис"
                  value={roomForm.description}
                  onChange={(value) => setRoomForm((current) => ({ ...current, description: value }))}
                  placeholder="Основна захищена зона"
                />

                <Button type="submit" className="w-full" disabled={createRoomMutation.isPending}>
                  {createRoomMutation.isPending ? "Створення..." : "Створити кімнату"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Прив'язати новий пристрій</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-white/75 p-4">
                <label className="mb-2 block text-sm font-medium">Вільна кімната для прив'язки</label>
                <select
                  value={selectedRoomId}
                  onChange={(event) => setSelectedRoomId(event.target.value)}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none ring-0 focus:border-primary"
                >
                  <option value="">Оберіть кімнату</option>
                  {availableRooms.map((room) => (
                    <option key={room._id} value={room.roomId}>
                      {room.roomName} ({room.roomId})
                    </option>
                  ))}
                </select>
              </div>

              {unprovisioned.length === 0 ? (
                <EmptyState
                  title="Нових пристроїв немає"
                  description="Коли новий ESP32 з'явиться в MQTT, він автоматично стане доступним у цьому списку."
                />
              ) : (
                <div className="space-y-3">
                  {unprovisioned.map((device) => (
                    <div key={device._id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-amber-900">{device.deviceId}</p>
                          <p className="text-sm text-amber-800">
                            {device.firmwareVersion || "Немає даних про прошивку"}
                          </p>
                          <p className="text-xs text-amber-700">
                            Остання активність: {formatDateTime(device.lastSeenAt)}
                          </p>
                        </div>
                        <Button
                          disabled={!selectedRoomId || provisionMutation.isPending}
                          onClick={() =>
                            setPendingProvision({
                              deviceId: device.deviceId,
                              roomId: selectedRoomId,
                            })
                          }
                        >
                          {provisionMutation.isPending ? "Відправка..." : "Прив'язати"}
                        </Button>
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
        open={Boolean(pendingProvision)}
        title="Підтвердити прив'язку"
        description={
          pendingProvision && selectedRoom
            ? `Прив'язати ${pendingProvision.deviceId} до кімнати ${selectedRoom.roomName} (${selectedRoom.roomId})?`
            : "Підтвердити прив'язку пристрою?"
        }
        confirmLabel="Так, прив'язати"
        loading={provisionMutation.isPending}
        onCancel={() => setPendingProvision(null)}
        onConfirm={() => {
          if (!pendingProvision) return;
          provisionMutation.mutate(pendingProvision);
        }}
      />
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none ring-0 focus:border-primary"
      />
    </label>
  );
}
