import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
} from './config';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enAuth from './locales/en/auth.json';
import enUsers from './locales/en/users.json';
import enRoles from './locales/en/roles.json';
import enPermissions from './locales/en/permissions.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';
import enValidation from './locales/en/validation.json';

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    users: enUsers,
    roles: enRoles,
    permissions: enPermissions,
    settings: enSettings,
    dashboard: enDashboard,
    validation: enValidation,
  },
} as const;

function initialLanguage(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;
  return DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  ns: [...NAMESPACES],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Persist and switch the active language. */
export function setLanguage(code: string): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  void i18n.changeLanguage(code);
}

export default i18n;
