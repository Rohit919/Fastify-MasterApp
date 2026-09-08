import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usersApi } from "@/modules/users/api/users.api";
import { useAuthStore } from "@/stores/auth.store";
import { notify } from "@/lib/notify";
import { mapApiError } from "@/lib/errors";
import type {
  CreateUserBody,
  UpdateUserBody,
  UpdateProfileBody,
} from "@app/api-contracts";

/** Invalidate every users-list query (any filter combination). */
function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["users", "list"] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: CreateUserBody) => usersApi.create(body),
    onSuccess: () => {
      void invalidate();
      notify.success(t("users:create.success"));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateUserBody }) =>
      usersApi.update(userId, body),
    onSuccess: () => {
      void invalidate();
      notify.success(t("users:edit.success"));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (userId: string) => usersApi.remove(userId),
    onSuccess: () => {
      void invalidate();
      notify.success(t("users:delete.success"));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}

/**
 * Bulk-delete users. The backend has no batch endpoint, so this deletes
 * sequentially (via the single DELETE) and reports a combined result — partial
 * failures are surfaced without aborting the whole batch. Invalidates once.
 */
export function useBulkDeleteUsers() {
  const invalidate = useInvalidateUsers();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      const results = await Promise.allSettled(
        userIds.map((id) => usersApi.remove(id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return { total: userIds.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      void invalidate();
      if (failed === 0) {
        notify.success(t("users:bulkDelete.success", { count: total }));
      } else {
        notify.warning(t("users:bulkDelete.partial", { failed, total }));
      }
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}

/** Update the authenticated user's own profile (PATCH /users/me). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => usersApi.updateProfile(body),
    onSuccess: (updated) => {
      // Keep the store's `user` (drives header/menu) in sync with the change.
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().setSession({
          accessToken: useAuthStore.getState().accessToken ?? "",
          user: { ...current, name: updated.name, email: updated.email },
        });
      }
      // Refresh /me so settings + effective context reflect the new profile.
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      notify.success(t("settings:profile.updateSuccess"));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}
