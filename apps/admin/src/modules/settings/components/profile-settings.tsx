import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/forms/form-field";
import { Loading } from "@/components/feedback/loading";
import { useCurrentUser } from "@/modules/users/hooks/use-current-user";
import { useUpdateProfile } from "@/modules/users/hooks/use-user-mutations";
import { profileSchema, type ProfileForm } from "@/modules/users/schemas";
import { formatDate } from "@/lib/utils";

/**
 * Editable profile — the caller can update their own name and email
 * (PATCH /users/me). Role and membership date are read-only (role changes are
 * a privilege operation handled via admin/role endpoints).
 */
export function ProfileSettings() {
  const { t } = useTranslation();
  const { data, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    // Sync to /me once it loads (reliable pre-fill for untouched fields).
    values: { name: data?.name ?? "", email: data?.email ?? "" },
  });

  if (isLoading) return <Loading />;
  if (!data) return null;

  const onSubmit = (values: ProfileForm) => updateProfile.mutate(values);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar name={data.name} className="h-14 w-14 text-lg" />
          <div>
            <CardTitle>{t("settings:profile.title")}</CardTitle>
            <CardDescription>{t("settings:profile.subtitle")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-md space-y-4"
          noValidate
        >
          <TextField
            label={t("settings:profile.name")}
            error={errors.name?.message}
            {...register("name")}
          />
          <TextField
            label={t("settings:profile.email")}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">
              {t("settings:profile.role")}
            </span>
            <Badge variant="secondary">{data.role}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("settings:profile.memberSince")}
            </span>
            <span className="text-sm font-medium">
              {formatDate(data.createdAt)}
            </span>
          </div>

          <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
            {updateProfile.isPending && <Spinner />}
            {t("settings:profile.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
