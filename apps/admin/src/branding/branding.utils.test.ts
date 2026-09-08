import { describe, it, expect } from "vitest";
import {
  normalizeColor,
  parseColor,
  isSafeAssetUrl,
  resolveAssetUrl,
  getReadableForeground,
  validateBranding,
  updateFavicon,
  updateDocumentTitle,
} from "./branding.utils";
import { DEFAULT_BRANDING } from "./branding.config";

describe("normalizeColor / parseColor", () => {
  it('normalizes hex to an "H S% L%" triplet', () => {
    // #4f46e5 (indigo) ~ 244 76% 58%
    const out = normalizeColor("#4f46e5");
    expect(out).toMatch(/^\d+ \d+% \d+%$/);
  });

  it("accepts a bare HSL triplet unchanged in shape", () => {
    expect(normalizeColor("243 75% 59%")).toBe("243 75% 59%");
  });

  it("parses rgb() and hsl()", () => {
    expect(parseColor("rgb(37, 99, 235)")).not.toBeNull();
    expect(parseColor("hsl(217, 91%, 53%)")).not.toBeNull();
  });

  it("returns null for garbage", () => {
    expect(normalizeColor("not-a-color")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("isSafeAssetUrl / resolveAssetUrl", () => {
  it("allows same-origin relative paths and https", () => {
    expect(isSafeAssetUrl("/brand/logo.svg")).toBe(true);
    expect(isSafeAssetUrl("https://cdn.example.com/logo.svg")).toBe(true);
  });

  it("rejects unsafe schemes and mixed content", () => {
    expect(isSafeAssetUrl("http://example.com/x.png")).toBe(false);
    expect(isSafeAssetUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeAssetUrl("data:image/svg+xml;base64,AAAA")).toBe(false);
    expect(isSafeAssetUrl("//evil.example.com/x.png")).toBe(false);
    expect(isSafeAssetUrl("")).toBe(false);
  });

  it("resolveAssetUrl returns undefined for unsafe input", () => {
    expect(resolveAssetUrl("javascript:alert(1)")).toBeUndefined();
    expect(resolveAssetUrl(undefined)).toBeUndefined();
    expect(resolveAssetUrl("/ok.svg")).toBe("/ok.svg");
  });
});

describe("getReadableForeground", () => {
  it("returns light foreground for dark backgrounds", () => {
    expect(getReadableForeground("222 47% 11%")).toBe("0 0% 100%");
  });

  it("returns dark foreground for light backgrounds", () => {
    expect(getReadableForeground("0 0% 95%")).toBe("222.2 47.4% 11.2%");
  });
});

describe("validateBranding", () => {
  it("falls back to defaults for non-objects", () => {
    expect(validateBranding(null)).toEqual(DEFAULT_BRANDING);
    expect(validateBranding("x")).toEqual(DEFAULT_BRANDING);
  });

  it("fills required fields from defaults when missing", () => {
    const out = validateBranding({ colors: {} });
    expect(out.appName).toBe(DEFAULT_BRANDING.appName);
    expect(out.shortName).toBe(DEFAULT_BRANDING.shortName);
    expect(out.colors.primary).toBe(DEFAULT_BRANDING.colors.primary);
  });

  it("normalizes valid colors and drops invalid ones", () => {
    const out = validateBranding({
      appName: "Acme",
      shortName: "Acme",
      colors: { primary: "#2563EB", secondary: "nope" },
    });
    expect(out.appName).toBe("Acme");
    expect(out.colors.primary).toMatch(/^\d+ \d+% \d+%$/);
    expect(out.colors.secondary).toBeUndefined();
  });

  it("drops unsafe asset URLs", () => {
    const out = validateBranding({
      appName: "Acme",
      shortName: "Acme",
      colors: { primary: "#2563EB" },
      logo: "javascript:alert(1)",
      favicon: "/favicon.svg",
    });
    expect(out.logo).toBeUndefined();
    expect(out.favicon).toBe("/favicon.svg");
  });

  it("caps overly long strings", () => {
    const out = validateBranding({
      appName: "a".repeat(500),
      shortName: "b".repeat(500),
      colors: { primary: "#2563EB" },
    });
    expect(out.appName.length).toBeLessThanOrEqual(80);
    expect(out.shortName.length).toBeLessThanOrEqual(24);
  });
});

describe("DOM helpers", () => {
  it("updateDocumentTitle formats with and without a page label", () => {
    updateDocumentTitle("Acme");
    expect(document.title).toBe("Acme");
    updateDocumentTitle("Acme", "Users");
    expect(document.title).toBe("Users · Acme");
  });

  it("updateFavicon creates a single link and replaces on re-call", () => {
    updateFavicon("/a.svg");
    const first = document.getElementById("app-favicon") as HTMLLinkElement;
    expect(first).toBeTruthy();
    expect(first.href).toContain("/a.svg");
    expect(first.type).toBe("image/svg+xml");

    updateFavicon("/b.png");
    const links = document.querySelectorAll("#app-favicon");
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toContain("/b.png");
    expect((links[0] as HTMLLinkElement).type).toBe("image/png");

    // Unsafe URL is ignored (link unchanged).
    updateFavicon("javascript:alert(1)");
    expect(
      (document.getElementById("app-favicon") as HTMLLinkElement).href,
    ).toContain("/b.png");
  });
});
