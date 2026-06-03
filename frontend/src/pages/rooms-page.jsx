import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { canPerformAction } from "@/features/auth/permissions";
import { archiveRoom, fetchRooms } from "@/shared/api/rooms";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { useToast } from "@/shared/feedback/toast-provider";
import { formatAlarmReason, formatDateTime, formatZoneType } from "@/shared/lib/utils";

function RoomsLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="glass-panel space-y-5 p-6">
          <div>
            <LoadingSkeleton className="h-5 w-40" />
            <LoadingSkeleton className="mt-3 h-3 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((__, metricIndex) => (
              <div key={metricIndex}>
                <LoadingSkeleton className="h-3 w-20" />
                <LoadingSkeleton className="mt-2 h-4 w-24" />
              </div>
            ))}
          </div>
          <LoadingSkeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

export function RoomsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pendingArchiveRoom, setPendingArchiveRoom] = useState(null);
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
  });

  const rooms = roomsQuery.data || [];
  const canArchiveRoom = canPerformAction(user?.role, "roomArchive");

  const archiveRoomMutation = useMutation({
    mutationFn: archiveRoom,
    onSuccess: (_room, roomId) => {
      setPendingArchiveRoom(null);
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("Кімнату архівовано", `Кімната ${roomId} більше не показується в активних списках.`);
    },
    onError: (error) => {
      toast.error("Не вдалося архівувати кімнату", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Кімнати"
        title="Кімнати та прив'язані вузли"
        description="Огляд усіх зон системи: яка кімната вже має свій ESP32, коли востаннє надходила телеметрія і куди перейти для детального моніторингу."
      />

      {roomsQuery.isLoading ? <RoomsLoadingState /> : null}

      {roomsQuery.isError ? (
        <ErrorState
          title="Не вдалося завантажити кімнати"
          description="Список кімнат зараз недоступний. Перевір backend або повтори запит."
          onRetry={() => roomsQuery.refetch()}
        />
      ) : null}

      {!roomsQuery.isLoading && !roomsQuery.isError ? (
        rooms.length === 0 ? (
          <EmptyState
            title="Кімнат поки немає"
            description="Створи першу кімнату через сторінку прив'язки, після чого вона з'явиться тут і буде готова до роботи."
            actions={
              <Button asChild>
                <Link to="/provisioning">Створити кімнату</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room._id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{room.roomName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {room.roomId} • {formatZoneType(room.zoneType)}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Пристрій</p>
                      <p className="font-medium">{room.deviceId || "Не прив'язано"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Остання телеметрія</p>
                      <p className="font-medium">{formatDateTime(room.lastTelemetryAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Тривога</p>
                      <p className="font-medium">{room.alarmActive ? formatAlarmReason(room.alarmReason) : "Немає"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Режим охорони</p>
                      <p className="font-medium">{room.armed ? "Увімкнено" : "Вимкнено"}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
                    <Link
                      to={`/rooms/${room.roomId}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-panel transition hover:opacity-95"
                    >
                      Відкрити кімнату
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    {canArchiveRoom ? (
                      <Button
                        className="w-full"
                        variant="outline"
                        disabled={archiveRoomMutation.isPending}
                        onClick={() => setPendingArchiveRoom(room)}
                      >
                        Архівувати
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingArchiveRoom)}
        title="Архівувати кімнату"
        description={
          pendingArchiveRoom
            ? `Архівувати кімнату ${pendingArchiveRoom.roomName}? Вона зникне з активних списків, а історія подій, тривог і команд залишиться в журналі.`
            : "Архівувати кімнату?"
        }
        confirmLabel="Так, архівувати"
        loading={archiveRoomMutation.isPending}
        onCancel={() => setPendingArchiveRoom(null)}
        onConfirm={() => {
          if (!pendingArchiveRoom) return;
          archiveRoomMutation.mutate(pendingArchiveRoom.roomId);
        }}
      />
    </div>
  );
}
