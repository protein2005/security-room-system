import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { canPerformAction } from "@/features/auth/permissions";
import {
  fetchPushSubscriptions,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/shared/api/push-subscriptions";
import {
  fetchTelegramConfig,
  fetchTelegramStatus,
  unlinkTelegram,
  updateTelegramConfig,
  updateTelegramEnabled,
} from "@/shared/api/telegram";
import { createUser, deleteUser, fetchUsers, updateCurrentUser } from "@/shared/api/users";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { useToast } from "@/shared/feedback/toast-provider";
import { formatUserRole } from "@/shared/lib/utils";
import { createBrowserPushSubscription, removeBrowserPushSubscription } from "@/shared/lib/web-push";

function SettingsLoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="glass-panel space-y-4 p-6">
          <LoadingSkeleton className="h-6 w-32" />
          <LoadingSkeleton className="h-12 w-full" />
          <LoadingSkeleton className="h-12 w-full" />
          <LoadingSkeleton className="h-12 w-40" />
        </div>
      ))}
    </div>
  );
}

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({
    login: "",
    name: "",
    currentPassword: "",
    newPassword: "",
  });
  const [createUserForm, setCreateUserForm] = useState({
    login: "",
    name: "",
    password: "",
    role: "viewer",
  });
  const [telegramConfigForm, setTelegramConfigForm] = useState({
    botName: "",
    botToken: "",
  });
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const canManageUsers = canPerformAction(user?.role, "userManagement");
  const canChangePassword = canPerformAction(user?.role, "passwordChange");
  const currentUserId = user?._id || "anonymous";

  const pushSubscriptionsQuery = useQuery({
    queryKey: ["push-subscriptions"],
    queryFn: fetchPushSubscriptions,
  });

  const telegramStatusQuery = useQuery({
    queryKey: ["telegram-status", currentUserId],
    queryFn: fetchTelegramStatus,
    enabled: Boolean(user?._id),
  });

  const telegramConfigQuery = useQuery({
    queryKey: ["telegram-config"],
    queryFn: fetchTelegramConfig,
    enabled: canManageUsers,
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: canManageUsers,
  });

  useEffect(() => {
    setProfileForm((current) => ({
      ...current,
      login: user?.login || "",
      name: user?.name || "",
    }));
  }, [user?.login, user?.name]);

  useEffect(() => {
    if (!telegramConfigQuery.data) {
      return;
    }

    setTelegramConfigForm({
      botName: telegramConfigQuery.data.botName || "",
      botToken: "",
    });
  }, [telegramConfigQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Профіль оновлено", "Нові дані користувача успішно збережено.");
      setProfileForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
      }));
    },
    onError: (error) => {
      toast.error("Не вдалося оновити профіль", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Користувача створено", "Новий акаунт уже готовий до входу.");
      setCreateUserForm({
        login: "",
        name: "",
        password: "",
        role: "viewer",
      });
    },
    onError: (error) => {
      toast.error("Не вдалося створити користувача", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Користувача видалено", "Акаунт успішно видалено із системи.");
      setPendingDeleteUser(null);
    },
    onError: (error) => {
      toast.error("Не вдалося видалити користувача", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  const enablePushMutation = useMutation({
    mutationFn: async () => {
      const publicKey = pushSubscriptionsQuery.data?.publicKey;

      if (!publicKey) {
        throw new Error("Web Push public key is missing");
      }

      const subscription = await createBrowserPushSubscription(publicKey);
      return subscribeToPush(subscription);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscriptions"] });
      toast.success("Web Push увімкнено", "Тепер система може надсилати браузерні сповіщення про тривоги.");
    },
    onError: (error) => {
      toast.error("Не вдалося увімкнути Web Push", error?.message || "Спробуй ще раз.");
    },
  });

  const disablePushMutation = useMutation({
    mutationFn: async () => {
      const subscription = await removeBrowserPushSubscription();

      if (!subscription) {
        return null;
      }

      await unsubscribeFromPush(subscription);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscriptions"] });
      toast.success("Web Push вимкнено", "Браузерні сповіщення про тривоги вимкнено.");
    },
    onError: (error) => {
      toast.error("Не вдалося вимкнути Web Push", error?.message || "Спробуй ще раз.");
    },
  });

  const unlinkTelegramMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: (result) => {
      if (result?.telegramStatus) {
        queryClient.setQueryData(["telegram-status", currentUserId], result.telegramStatus);
      }

      queryClient.invalidateQueries({ queryKey: ["telegram-status", currentUserId] });
      toast.success("Telegram відключено", "Бот більше не надсилатиме сповіщення цьому акаунту.");
    },
    onError: (error) => {
      toast.error("Не вдалося відключити Telegram", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  const toggleTelegramMutation = useMutation({
    mutationFn: updateTelegramEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telegram-status", currentUserId] });
      toast.success("Telegram налаштовано", "Статус Telegram-сповіщень оновлено.");
    },
    onError: (error) => {
      toast.error("Не вдалося змінити статус Telegram", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  const updateTelegramConfigMutation = useMutation({
    mutationFn: updateTelegramConfig,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["telegram-config"] });
      queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
      setTelegramConfigForm((current) => ({
        ...current,
        botToken: "",
      }));

      if (result?.isConfigured) {
        toast.success(
          "Telegram-бот налаштовано",
          result?.requiresRelink
            ? "Конфіг бота змінено. Користувачам потрібно заново підключити Telegram."
            : "Тепер користувачі можуть підписуватися на цього Telegram-бота."
        );
      } else {
        toast.success("Telegram-бот вимкнено", "Інтеграцію Telegram очищено в системних налаштуваннях.");
      }
    },
    onError: (error) => {
      toast.error("Не вдалося зберегти Telegram-бота", error?.response?.data?.message || "Спробуй ще раз.");
    },
  });

  const users = usersQuery.data || [];
  const pushSubscriptions = pushSubscriptionsQuery.data?.subscriptions || [];
  const hasPushEnabled = pushSubscriptions.length > 0;
  const telegramStatus = telegramStatusQuery.data;
  const telegramConfig = telegramConfigQuery.data;
  const isTelegramLinked = Boolean(telegramStatus?.isLinked);
  const isTelegramEnabled = Boolean(telegramStatus?.isEnabled);

  return (
    <div className="page-shell">
      <SectionHeading
        eyebrow="Налаштування"
        title="Користувачі та доступ"
        description="Тут можна оновити свій профіль, а адміністратор також може створювати нові акаунти, змінювати свій пароль і видаляти користувачів."
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Мій профіль</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const payload = {
                  login: profileForm.login,
                  name: profileForm.name,
                };

                if (canChangePassword && (profileForm.currentPassword || profileForm.newPassword)) {
                  payload.currentPassword = profileForm.currentPassword;
                  payload.newPassword = profileForm.newPassword;
                }

                updateProfileMutation.mutate(payload);
              }}
            >
              <FormInput
                label="Логін"
                value={profileForm.login}
                onChange={(value) => setProfileForm((current) => ({ ...current, login: value }))}
                placeholder="admin"
              />
              <FormInput
                label="Ім'я"
                value={profileForm.name}
                onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))}
                placeholder="System Administrator"
              />
              {canChangePassword ? (
                <>
                  <FormInput
                    label="Поточний пароль"
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(value) => setProfileForm((current) => ({ ...current, currentPassword: value }))}
                    placeholder="Введи поточний пароль"
                  />
                  <FormInput
                    label="Новий пароль"
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(value) => setProfileForm((current) => ({ ...current, newPassword: value }))}
                    placeholder="Залиш порожнім, якщо не змінюєш"
                  />
                </>
              ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                  Змінювати пароль може лише адміністратор системи.
                </p>
              )}
              <button
                type="submit"
                className="rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-panel transition hover:opacity-95"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Збереження..." : "Зберегти зміни"}
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canManageUsers ? (
            <Card>
              <CardHeader>
                <CardTitle>Telegram-бот системи</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateTelegramConfigMutation.mutate({
                      botName: telegramConfigForm.botName,
                      botToken: telegramConfigForm.botToken || undefined,
                    });
                  }}
                >
                  <div className="rounded-2xl bg-white/80 p-4">
                    <p className="text-sm font-semibold">
                      {telegramConfig?.isConfigured ? "Бот налаштований" : "Бот ще не налаштований"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Адміністратор задає username і token бота один раз, а всі інші ролі потім
                      підписуються саме на цього бота зі своїх акаунтів.
                    </p>
                    {telegramConfig?.botName ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Поточний бот: @{telegramConfig.botName}
                        {telegramConfig?.maskedToken ? ` • ${telegramConfig.maskedToken}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <FormInput
                    label="Username бота"
                    value={telegramConfigForm.botName}
                    onChange={(value) => setTelegramConfigForm((current) => ({ ...current, botName: value }))}
                    placeholder="security_room_alerts_bot"
                  />
                  <FormInput
                    label="Bot token"
                    value={telegramConfigForm.botToken}
                    onChange={(value) => setTelegramConfigForm((current) => ({ ...current, botToken: value }))}
                    placeholder={telegramConfig?.hasToken ? "Залиш порожнім, щоб не змінювати token" : "123456:ABC..."}
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-panel transition hover:opacity-95"
                      disabled={updateTelegramConfigMutation.isPending}
                    >
                      {updateTelegramConfigMutation.isPending ? "Збереження..." : "Зберегти бота"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-border bg-white px-5 py-2.5 font-medium transition hover:bg-slate-50"
                      disabled={updateTelegramConfigMutation.isPending || !telegramConfig?.hasToken}
                      onClick={() =>
                        updateTelegramConfigMutation.mutate({
                          botName: "",
                          botToken: "",
                        })
                      }
                    >
                      Очистити конфіг
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Web Push сповіщення</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-sm font-semibold">
                  {hasPushEnabled ? "Сповіщення увімкнені" : "Сповіщення вимкнені"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Коли в системі з’явиться нова тривога, браузер покаже системне повідомлення навіть
                  якщо вкладка не у фокусі.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-panel transition hover:opacity-95"
                  disabled={hasPushEnabled || enablePushMutation.isPending || pushSubscriptionsQuery.isLoading}
                  onClick={() => enablePushMutation.mutate()}
                >
                  {enablePushMutation.isPending ? "Увімкнення..." : "Увімкнути Web Push"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border bg-white px-5 py-2.5 font-medium transition hover:bg-slate-50"
                  disabled={!hasPushEnabled || disablePushMutation.isPending || pushSubscriptionsQuery.isLoading}
                  onClick={() => disablePushMutation.mutate()}
                >
                  {disablePushMutation.isPending ? "Вимкнення..." : "Вимкнути Web Push"}
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telegram сповіщення</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-sm font-semibold">
                  {isTelegramLinked ? "Telegram підключено" : "Telegram не підключено"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Після прив’язки бота система зможе надсилати тобі тривоги прямо в Telegram, навіть
                  якщо браузер не відкритий.
                </p>
                {telegramStatus?.botName ? (
                  <p className="mt-2 text-xs text-muted-foreground">Бот: @{telegramStatus.botName}</p>
                ) : null}
                {telegramStatus?.telegramUsername ? (
                  <p className="mt-2 text-xs text-muted-foreground">Telegram: @{telegramStatus.telegramUsername}</p>
                ) : null}
              </div>

              {telegramStatus?.isConfigured ? (
                <>
                  {!isTelegramLinked ? (
                    <a
                      href={telegramStatus.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-panel transition hover:opacity-95"
                    >
                      Підключити Telegram
                    </a>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-panel transition hover:opacity-95"
                        disabled={isTelegramEnabled || toggleTelegramMutation.isPending}
                        onClick={() => toggleTelegramMutation.mutate(true)}
                      >
                        Увімкнути Telegram
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-border bg-white px-5 py-2.5 font-medium transition hover:bg-slate-50"
                        disabled={!isTelegramEnabled || toggleTelegramMutation.isPending}
                        onClick={() => toggleTelegramMutation.mutate(false)}
                      >
                        Вимкнути Telegram
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 font-medium text-rose-700 transition hover:bg-rose-100"
                        disabled={unlinkTelegramMutation.isPending}
                        onClick={() => unlinkTelegramMutation.mutate()}
                      >
                        Відключити бота
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
                  Telegram-бот ще не налаштований адміністратором у системних налаштуваннях.
                </p>
              )}
            </CardContent>
          </Card>

          {canManageUsers ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Створити користувача</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    className="grid gap-4 md:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      createUserMutation.mutate(createUserForm);
                    }}
                  >
                    <FormInput
                      label="Логін"
                      value={createUserForm.login}
                      onChange={(value) => setCreateUserForm((current) => ({ ...current, login: value }))}
                      placeholder="operator-1"
                    />
                    <FormInput
                      label="Ім'я"
                      value={createUserForm.name}
                      onChange={(value) => setCreateUserForm((current) => ({ ...current, name: value }))}
                      placeholder="Оператор зміни"
                    />
                    <FormInput
                      label="Пароль"
                      type="password"
                      value={createUserForm.password}
                      onChange={(value) => setCreateUserForm((current) => ({ ...current, password: value }))}
                      placeholder="Введи пароль"
                    />
                    <FormSelect
                      label="Роль"
                      value={createUserForm.role}
                      onChange={(value) => setCreateUserForm((current) => ({ ...current, role: value }))}
                      options={[
                        { value: "viewer", label: "Спостерігач" },
                        { value: "operator", label: "Оператор" },
                        { value: "admin", label: "Адміністратор" },
                      ]}
                    />
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        className="rounded-full bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow-panel transition hover:opacity-95"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Створення..." : "Створити акаунт"}
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Усі користувачі</CardTitle>
                </CardHeader>
                <CardContent>
                  {usersQuery.isLoading ? <SettingsLoadingState /> : null}
                  {usersQuery.isError ? (
                    <ErrorState
                      title="Не вдалося завантажити користувачів"
                      description="Список користувачів тимчасово недоступний."
                      onRetry={() => usersQuery.refetch()}
                    />
                  ) : null}
                  {!usersQuery.isLoading && !usersQuery.isError ? (
                    <div className="space-y-3">
                      {users.map((item) => (
                        <div key={item._id} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.login} • {formatUserRole(item.role)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {item.isActive ? "Активний" : "Вимкнений"}
                              </span>
                              {item._id !== user?._id ? (
                                <button
                                  type="button"
                                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                  onClick={() => setPendingDeleteUser(item)}
                                >
                                  Видалити
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteUser)}
        title="Видалити акаунт?"
        description={
          pendingDeleteUser
            ? `Підтвердь видалення користувача ${pendingDeleteUser.name} (${pendingDeleteUser.login}).`
            : "Підтвердь видалення акаунта."
        }
        confirmLabel="Так, видалити"
        loading={deleteUserMutation.isPending}
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={() => {
          if (!pendingDeleteUser) return;
          deleteUserMutation.mutate(pendingDeleteUser._id);
        }}
      />
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"
      />
    </label>
  );
}

function FormSelect({ label, value, onChange, options }) {
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
