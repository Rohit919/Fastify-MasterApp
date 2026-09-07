import { afterEach, expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Register jest-dom matchers explicitly against Vitest's expect. (The
// `/vitest` auto-extend entry can miss depending on load order; this is
// deterministic.)
expect.extend(matchers);
// Initialize the real i18n instance so `t()` resolves English strings in tests.
import '@/i18n';

// jsdom doesn't implement matchMedia (used by the ThemeProvider). Stub it.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// Unmount React trees between tests to avoid cross-test leakage.
afterEach(() => {
  cleanup();
});
