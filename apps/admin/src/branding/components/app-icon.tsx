import { useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranding } from "../branding.provider";

/**
 * <AppIcon /> — the compact brand mark for tight spaces (collapsed sidebar,
 * mobile nav, loading states, the auth brand chip).
 *
 * Renders the tenant `icon` image when configured and it loads; otherwise falls
 * back to the default lucide `Zap` glyph. On image error it degrades to the
 * glyph rather than showing a broken image. The wrapper's size/background is
 * controlled by the caller via `className` so it drops into existing chips.
 */
export function AppIcon({
  className,
  imgClassName,
}: {
  className?: string;
  imgClassName?: string;
}) {
  const { branding, shortName } = useBranding();
  const [failed, setFailed] = useState(false);
  const src = branding.icon;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setFailed(true)}
        className={cn("h-5 w-5 object-contain", imgClassName, className)}
      />
    );
  }

  return <Zap className={cn("h-5 w-5", className)} aria-label={shortName} />;
}
