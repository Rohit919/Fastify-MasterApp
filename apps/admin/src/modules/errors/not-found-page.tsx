import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AppLogo, AppName } from "@/branding";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 text-center">
      {/* Brand mark — this is a standalone full-screen page, so it carries the
          tenant brand (logo + name) rather than only theme tokens. */}
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <AppLogo className="h-5 w-5" imgClassName="h-5 w-5" />
        </span>
        <AppName />
      </div>
      <p className="text-6xl font-bold text-primary">404</p>
      <div>
        <h1 className="text-2xl font-semibold">
          {t("common:notFoundPage.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("common:notFoundPage.message")}
        </p>
      </div>
      <Button asChild>
        <Link to="/dashboard">{t("common:notFoundPage.back")}</Link>
      </Button>
    </div>
  );
}
