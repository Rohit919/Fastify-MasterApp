import { useEffect } from "react";
import { useBranding } from "../branding.provider";
import { updateFavicon } from "../branding.utils";

/**
 * <FaviconManager /> — declaratively keeps the document favicon in sync with
 * branding. The BrandingProvider already applies the favicon on change; this
 * component exists so the behavior can be mounted/tested in isolation and made
 * explicit in the tree if desired. Rendering it is optional and idempotent.
 */
export function FaviconManager() {
  const { branding } = useBranding();

  useEffect(() => {
    updateFavicon(branding.favicon);
  }, [branding.favicon]);

  return null;
}
