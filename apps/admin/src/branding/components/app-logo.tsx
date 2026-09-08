import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/app/providers/theme-provider";
import { useBranding } from "../branding.provider";
import { AppIcon } from "./app-icon";

/**
 * <AppLogo /> — the full brand mark. Automatically selects the dark logo when
 * the resolved theme is dark (falling back to the light logo, then the icon).
 *
 * Contexts: login/auth panels, sidebar header, loading screen. When no logo
 * asset is configured (or it fails to load) it degrades to <AppIcon />, so the
 * brand is always represented and there are never broken images.
 */
export function AppLogo({
  className,
  imgClassName,
}: {
  className?: string;
  imgClassName?: string;
}) {
  const { branding, appName } = useBranding();
  const { resolvedTheme } = useTheme();
  const [failed, setFailed] = useState(false);

  const src =
    resolvedTheme === "dark"
      ? (branding.logoDark ?? branding.logo)
      : branding.logo;

  if (!src || failed) {
    return <AppIcon className={className} imgClassName={imgClassName} />;
  }

  return (
    <img
      src={src}
      alt={appName}
      onError={() => setFailed(true)}
      className={cn(
        "h-6 w-auto max-w-[160px] object-contain",
        imgClassName,
        className,
      )}
    />
  );
}
