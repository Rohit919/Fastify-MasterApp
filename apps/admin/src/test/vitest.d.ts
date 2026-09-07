/// <reference types="vitest/globals" />

// Augment Vitest's matchers with @testing-library/jest-dom (toBeInTheDocument, etc.)
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  // Empty interfaces are required here: they merge jest-dom's matcher set into
  // Vitest's Assertion types. eslint-disable is intentional.
  /* eslint-disable @typescript-eslint/no-empty-object-type */
  interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, void> {}
  /* eslint-enable @typescript-eslint/no-empty-object-type */
}
