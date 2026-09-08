import { useBranding } from "../branding.provider";

/**
 * <AppName /> — renders the tenant application name as plain text.
 *
 * A thin, centralized read of `branding.appName` so components never hardcode
 * the brand or reach into config directly. Use `short` for compact surfaces
 * (collapsed sidebar). Branding fields are ALWAYS treated as plain text.
 */
export function AppName({ short = false }: { short?: boolean }) {
  const { appName, shortName } = useBranding();
  return <>{short ? shortName : appName}</>;
}
