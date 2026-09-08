import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useLogin } from "@/modules/auth/hooks/use-login";
import { loginSchema, type LoginForm } from "@/modules/auth/schemas";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/forms/input-field";
import { Spinner } from "@/components/ui/spinner";
import { mapApiError } from "@/lib/errors";

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const login = useLogin();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = (values: LoginForm) => login.mutate(values);
  const errorMessage = login.error
    ? mapApiError(login.error, (k, f) => t(k, f))
    : null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth:login.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("auth:login.subtitle")}
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <InputField
          label={t("auth:login.email")}
          type="email"
          autoComplete="email"
          placeholder={t("auth:login.emailPlaceholder")}
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-1.5">
          <InputField
            label={t("auth:login.password")}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("auth:login.passwordPlaceholder")}
            icon={Lock}
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={
                  showPassword
                    ? t("auth:login.hidePassword")
                    : t("auth:login.showPassword")
                }
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("auth:login.forgotPassword")}
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={login.isPending}
        >
          {login.isPending && <Spinner />}
          {login.isPending
            ? t("auth:login.submitting")
            : t("auth:login.submit")}
        </Button>
      </form>
    </div>
  );
}
