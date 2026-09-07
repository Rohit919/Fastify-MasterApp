/**
 * i18n configuration. English is the only bundled locale for now; the structure
 * (namespaced JSON under locales/<lng>/) makes adding a language a drop-in.
 *
 * Namespaces map to feature areas so translations stay organized and lazy-load
 * cleanly if that's added later.
 */
export const SUPPORTED_LANGUAGES = [{ code: 'en', label: 'English' }] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'users',
  'roles',
  'permissions',
  'settings',
  'dashboard',
  'validation',
] as const;

export const LANGUAGE_STORAGE_KEY = 'admin-language';
