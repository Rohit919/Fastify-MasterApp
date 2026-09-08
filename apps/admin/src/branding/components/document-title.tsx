import { useEffect } from "react";
import { useBranding } from "../branding.provider";
import { updateDocumentTitle } from "../branding.utils";

/**
 * <DocumentTitle title="Users" /> — centralized per-page title strategy.
 *
 * Sets `document.title` to `"<page> · <appName>"` and restores the plain app
 * name on unmount. Pages render this instead of touching `document.title`
 * directly, so titles stay brand-consistent. The BrandingProvider owns the base
 * title; this only layers a page label on top.
 */
export function DocumentTitle({ title }: { title?: string }) {
  const { appName } = useBranding();

  useEffect(() => {
    updateDocumentTitle(appName, title);
    return () => updateDocumentTitle(appName);
  }, [appName, title]);

  return null;
}
