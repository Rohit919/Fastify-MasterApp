import { Outlet } from "react-router-dom";
import { ShieldCheck, Users, Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppIcon, AppName, useBranding } from "@/branding";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Secure by design",
    desc: "JWT sessions, RBAC, and audited actions.",
  },
  {
    icon: Users,
    title: "User & role management",
    desc: "Invite, assign roles, and control access.",
  },
  {
    icon: Gauge,
    title: "Real-time overview",
    desc: "Live metrics and activity at a glance.",
  },
];

/**
 * Premium split-screen layout for unauthenticated pages (login, forgot/reset).
 * Left: a branded, gradient brand panel with feature highlights (desktop only).
 * Right: the routed form on a clean surface. Fully theme-aware and responsive —
 * on mobile the brand collapses to a compact logo header above the form.
 */
export function AuthLayout() {
  const { t } = useTranslation();
  const { branding } = useBranding();
  const year = new Date().getFullYear();
  const tagline =
    branding.metadata?.description ??
    t("auth:tagline", {
      defaultValue:
        "Manage users, roles, and permissions from one secure control panel.",
    });

  return (
    <div className="flex min-h-screen">
      {/* ── Brand panel (desktop) ──────────────────────────────────────────── */}
      <div className="auth-brand relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-sidebar-foreground lg:flex">
        <div
          className="auth-grid pointer-events-none absolute inset-0"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-2.5 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-foreground/10 ring-1 ring-inset ring-sidebar-foreground/20 backdrop-blur">
            <AppIcon className="h-5 w-5" imgClassName="h-6 w-6" />
          </span>
          <AppName />
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              <AppName />
            </h2>
            <p className="max-w-sm text-sidebar-foreground/70">{tagline}</p>
          </div>

          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-foreground/10 ring-1 ring-inset ring-sidebar-foreground/15">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-sidebar-foreground/60">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-sidebar-foreground/50">
          © {year} <AppName />
        </p>
      </div>

      {/* ── Form panel ─────────────────────────────────────────────────────── */}
      <div className="relative flex w-full flex-col items-center justify-center bg-background px-6 py-10 lg:w-1/2">
        {/* Ambient glow behind the form (subtle on all breakpoints). */}
        <div
          className="auth-glow pointer-events-none absolute inset-x-0 top-0 h-64"
          aria-hidden="true"
        />

        {/* Compact brand for mobile (brand panel is hidden < lg). */}
        <div className="relative mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <AppIcon className="h-5 w-5" imgClassName="h-5 w-5" />
          </span>
          <AppName />
        </div>

        <div className="relative w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
