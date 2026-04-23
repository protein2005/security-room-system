import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { canPerformAction } from "@/features/auth/permissions";
import { createUser, deleteUser, fetchUsers, updateCurrentUser } from "@/shared/api/users";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingSkeleton } from "@/shared/components/loading-skeleton";
import { SectionHeading } from "@/shared/components/section-heading";
import { useToast } from "@/shared/feedback/toast-provider";
import { formatUserRole } from "@/shared/lib/utils";

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
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const canManageUsers = canPerformAction(user?.role, "userManagement");
  const canChangePassword = canPerformAction(user?.role, "passwordChange");

  useEffect(() => {
    setProfileForm((current) => ({
      ...current,
      login: user?.login || "",
      name: user?.name || "",
    }));
  }, [user?.login, user?.name]);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: canManageUsers,
  });

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

  const users = usersQuery.data || [];

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

        {canManageUsers ? (
          <div className="space-y-4">
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
          </div>
        ) : null}
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
