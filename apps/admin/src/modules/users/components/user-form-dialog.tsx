import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TextField, FormField } from "@/components/forms/form-field";
import {
  useCreateUser,
  useUpdateUser,
} from "@/modules/users/hooks/use-user-mutations";
import {
  userFormSchema,
  USER_ROLE_OPTIONS,
  type UserForm,
} from "@/modules/users/schemas";
import type { UserListItem } from "@/modules/users/api/users.api";

/**
 * Create/edit a user. On create it sends name+email+password+role; on edit it
 * sends name+email+role (password changes go through the auth flow). Wired to
 * the real backend user CRUD endpoints.
 */
export function UserFormDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(user);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userFormSchema(isEdit)),
    // `values` keeps the form in sync with the selected user (RHF re-syncs when
    // this object changes), which is more reliable than a reset() effect for
    // pre-filling untouched fields.
    values: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: (user?.role as UserForm["role"]) ?? "user",
    },
  });

  const onSubmit = (values: UserForm) => {
    if (isEdit && user) {
      updateUser.mutate(
        {
          userId: user.id,
          body: { name: values.name, email: values.email, role: values.role },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createUser.mutate(
        {
          name: values.name,
          email: values.email,
          password: values.password ?? "",
          role: values.role,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  const pending = createUser.isPending || updateUser.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("users:edit.title") : t("users:create.title")}
          </DialogTitle>
          <DialogDescription>{t("users:subtitle")}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <TextField
            label={t("users:form.name")}
            error={errors.name?.message}
            {...register("name")}
          />
          <TextField
            label={t("users:form.email")}
            type="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register("email")}
          />
          {!isEdit && (
            <TextField
              label={t("users:form.password")}
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
          )}
          <FormField
            label={t("users:form.role")}
            htmlFor="user-role"
            error={errors.role?.message}
          >
            <Select
              id="user-role"
              options={USER_ROLE_OPTIONS}
              {...register("role")}
            />
          </FormField>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {isEdit ? t("users:edit.submit") : t("users:create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
